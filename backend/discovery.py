from flask import Blueprint, request, jsonify
from extensions import db
from network import Network
import nmap
from ping3 import ping
from pysnmp.hlapi.v3arch.asyncio import *
import asyncio

discovery_bp = Blueprint('discovery', __name__)

# Helper function to ping an IP
def ping_device(ip):
    try:
        response_time = ping(ip, timeout=2)
        return 'online' if response_time is not None else 'offline'
    except Exception:
        return 'offline'

# Helper function to scan ports using nmap
def scan_ports(ip):
    try:
        nm = nmap.PortScanner()
        # Scan common ports (e.g., 22, 80, 161, 443) for speed
        nm.scan(ip, '22,80,161,443', arguments='-T4')
        if ip in nm.all_hosts():
            open_ports = [port for port, info in nm[ip]['tcp'].items() if info['state'] == 'open']
            return open_ports
        return []
    except Exception as e:
        print(f"Port scan error for {ip}: {e}")
        return []

# Helper function to check SNMP availability
async def check_snmp(ip):
    try:
        errorIndication, errorStatus, errorIndex, varBinds = await get_cmd(
            SnmpEngine(),
            CommunityData('public'),  # Default community string for initial check
            await UdpTransportTarget.create((ip, 161), timeout=2),
            ContextData(),
            ObjectType(ObjectIdentity('.1.3.6.1.2.1.1.1.0'))  # sysDescr OID
        )
        return not errorIndication and not errorStatus
    except Exception:
        return False

# Discover devices in a network
@discovery_bp.route('/discover/<int:network_id>', methods=['GET'])
async def discover_devices(network_id):
    try:
        print("querying")
        network = Network.query.get_or_404(network_id)
        ip_range = network.ip_range  # e.g., "192.168.1.0/24"
        # Use nmap to scan the IP range for alive hosts
        nm = nmap.PortScanner()
        nm.scan(hosts=ip_range, arguments='-sn')  # -sn: ping scan only

        devices = []
        for ip in nm.all_hosts():
            state = ping_device(ip)
            if state == 'online':
                ports = scan_ports(ip)
                snmp_available = await check_snmp(ip)
                devices.append({
                    'ip': ip,
                    'state': state,
                    'open_ports': ports,
                    'snmp_available': snmp_available
                })

        return jsonify(devices)
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

# Ping a specific device
@discovery_bp.route('/ping_device', methods=['POST'])
def ping_device_endpoint():
    try:
        data = request.get_json()
        ip = data.get('ip')
        if not ip:
            return jsonify({'error': 'IP address is required'}), 400
        state = ping_device(ip)
        return jsonify({'ip': ip, 'state': state})
    except Exception as e:
        return jsonify({'error': str(e)}), 500