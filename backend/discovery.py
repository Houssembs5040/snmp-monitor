from flask import Blueprint, request, jsonify
from extensions import db
from network import Network
import nmap
from ping3 import ping
import subprocess
import re

discovery_bp = Blueprint('discovery', __name__)

def ping_device(ip):
    try:
        response_time = ping(ip, timeout=2)
        return 'online' if response_time is not None else 'offline'
    except Exception:
        return 'offline'

def parse_nmap_output(output):
    """Parse nmap output into a structured format"""
    result = {
        'host': '',
        'status': '',
        'ports': []
    }
    
    # Extract host and status
    host_match = re.search(r'Nmap scan report for (.+)', output)
    if host_match:
        result['host'] = host_match.group(1)
    
    status_match = re.search(r'Host is up \((.+)\)', output)
    if status_match:
        result['status'] = f"Host is up ({status_match.group(1)})"
    
    # Extract port information
    port_pattern = re.compile(
        r'(\d+)/(tcp|udp)\s+(open|filtered|closed)\s+([^\n]+)'
    )
    
    for match in port_pattern.finditer(output):
        port, protocol, state, service = match.groups()
        result['ports'].append({
            'port': port,
            'protocol': protocol,
            'state': state,
            'service': service.strip()
        })
    
    return result

@discovery_bp.route('/discover/<int:network_id>', methods=['GET'])
def discover_devices(network_id):
    try:
        network = Network.query.get_or_404(network_id)
        ip_range = network.ip_range
        
        # Fast ping scan to find connected devices
        nm = nmap.PortScanner()
        nm.scan(hosts=ip_range, arguments='-sn')  # Ping scan only
        
        devices = []
        for ip in nm.all_hosts():
            state = ping_device(ip)
            devices.append({
                'ip': ip,
                'state': state,
                'basic_scan_done': False,
                'detailed_scan': None
            })

        return jsonify(devices)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@discovery_bp.route('/scan_device', methods=['POST'])
def scan_device():
    try:
        data = request.get_json()
        ip = data.get('ip')
        if not ip:
            return jsonify({'error': 'IP address is required'}), 400
        
        # Run nmap with -sS -sV -T5
        command = f"nmap -sS -sV -T5 {ip}"
        process = subprocess.Popen(
            command.split(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            return jsonify({'error': stderr}), 500
        
        # Parse the nmap output
        scan_result = parse_nmap_output(stdout)
        
        return jsonify({
            'ip': ip,
            'scan_result': scan_result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500