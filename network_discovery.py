import asyncio
import json
from flask import Flask, request, jsonify
from pysnmp.hlapi.v1arch.asyncio import *

app = Flask(__name__)

class NetworkGraph:
    def __init__(self):
        self.graph = {}
        self.nodes = {}

    def add_node(self, ip, device_type="Unknown", description="Pending scan", interface_ips=None):
        if interface_ips is None:
            interface_ips = []
        if ip not in self.graph:
            self.graph[ip] = []
            self.nodes[ip] = {
                "type": device_type,
                "desc": description,
                "interface_ips": interface_ips
            }
        else:
            if device_type != "Unknown":
                self.nodes[ip]["type"] = device_type
            if description != "Pending scan":
                self.nodes[ip]["desc"] = description
            if interface_ips:
                self.nodes[ip]["interface_ips"] = interface_ips

    def add_edge(self, from_ip, to_ip):
        if from_ip in self.graph and to_ip in self.graph and to_ip not in self.graph[from_ip]:
            self.graph[from_ip].append(to_ip)

    def to_dict(self):
        return {
            "nodes": self.nodes,
            "edges": [(from_ip, to_ip) for from_ip in self.graph for to_ip in self.graph[from_ip]]
        }

async def snmp_query(ip, oid, community="public", timeout=5):
    try:
        errorIndication, errorStatus, errorIndex, varBinds = await asyncio.wait_for(
            get_cmd(
                SnmpDispatcher(),
                CommunityData(community),
                await UdpTransportTarget.create((ip, 161)),
                ObjectType(ObjectIdentity(oid))
            ),
            timeout=timeout
        )
        if errorIndication or errorStatus:
            print(f"SNMP error for {ip}, OID {oid}: {errorIndication or errorStatus.prettyPrint()}")
            return None
        return str(varBinds[0][1]) if varBinds else None
    except asyncio.TimeoutError:
        print(f"Timeout querying {ip} for OID {oid}")
        return None
    except Exception as e:
        print(f"Exception querying {ip} for OID {oid}: {str(e)}")
        return None

async def snmp_walk(ip, oid, community="public", timeout=5):
    results = []
    current_oid = oid
    dispatcher = SnmpDispatcher()
    try:
        transport = await asyncio.wait_for(UdpTransportTarget.create((ip, 161)), timeout=timeout)
    except asyncio.TimeoutError:
        print(f"Timeout establishing transport to {ip}")
        return results
    
    while True:
        try:
            errorIndication, errorStatus, errorIndex, varBinds = await asyncio.wait_for(
                next_cmd(dispatcher, CommunityData(community), transport, ObjectType(ObjectIdentity(current_oid))),
                timeout=timeout
            )
            if errorIndication or errorStatus or not varBinds or not str(varBinds[0][0]).startswith(oid):
                break
            results.append((str(varBinds[0][0]), str(varBinds[0][1])))
            current_oid = str(varBinds[0][0])
        except asyncio.TimeoutError:
            print(f"Timeout walking {ip} at OID {current_oid}")
            break
    return results

async def get_interface_ips(ip):
    ip_entries = await snmp_walk(ip, "1.3.6.1.2.1.4.20.1.2")
    return [".".join(entry[0].split(".")[-4:]) for entry in ip_entries]

async def discover_network(start_ip):
    graph = NetworkGraph()
    to_scan = [(start_ip, None)]
    scanned = set()
    interface_to_device = {}
    
    while to_scan:
        ip, parent_ip = to_scan.pop(0)
        if ip in scanned:
            continue
        
        print(f"Scanning device at {ip}")
        scanned.add(ip)
        
        sys_descr = await snmp_query(ip, "1.3.6.1.2.1.1.1.0")
        if not sys_descr:
            graph.add_node(ip, "Unreachable", "Failed to retrieve description", [])
            continue
        
        if_num = await snmp_query(ip, "1.3.6.1.2.1.2.1.0")
        device_type = "Router" if if_num and int(if_num) > 2 else "Host"
        
        interface_ips = await get_interface_ips(ip)
        
        graph.add_node(ip, device_type, sys_descr, interface_ips)
        
        for iface_ip in interface_ips:
            interface_to_device[iface_ip] = ip
        
        if parent_ip and ip != parent_ip and ip not in graph.nodes[parent_ip]["interface_ips"]:
            graph.add_edge(parent_ip, ip)
        
        if device_type == "Router":
            arp_entries = await snmp_walk(ip, "1.3.6.1.2.1.4.22.1.3")
            for oid, value in arp_entries:
                neighbor_ip = ".".join(oid.split(".")[-4:])
                actual_device_ip = interface_to_device.get(neighbor_ip, neighbor_ip)
                
                if neighbor_ip in interface_ips:
                    continue
                
                if actual_device_ip not in scanned and (actual_device_ip, ip) not in to_scan:
                    print(f"Discovered neighbor {actual_device_ip} from {ip}")
                    to_scan.append((actual_device_ip, ip))
                    if actual_device_ip not in graph.graph:
                        graph.add_node(actual_device_ip)
                    graph.add_edge(ip, actual_device_ip)
    
    return graph

@app.route('/discover', methods=['POST'])
def discover():
    data = request.get_json()
    start_ip = data.get('ip')
    if not start_ip:
        return jsonify({"error": "Missing 'ip' in request body"}), 400
    
    try:
        # Run async discovery synchronously
        graph = asyncio.run(discover_network(start_ip))
        return jsonify(graph.to_dict())
    except Exception as e:
        print(f"Error in discovery: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)