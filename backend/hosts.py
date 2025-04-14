from flask import Blueprint, json, jsonify, request
from extensions import db
from ping3 import ping
from models import Host, Network
from pysnmp.hlapi.v3arch.asyncio import *

hosts_bp = Blueprint('hosts', __name__)

async def get_snmp_details(ip):
    try:
        sys_descr_error, _, _, sys_descr_var = await get_cmd(
            SnmpEngine(),
            CommunityData('public'),
            await UdpTransportTarget.create((ip, 161), timeout=2),
            ContextData(),
            ObjectType(ObjectIdentity('.1.3.6.1.2.1.1.1.0'))
        )
        sys_name_error, _, _, sys_name_var = await get_cmd(
            SnmpEngine(),
            CommunityData('public'),
            await UdpTransportTarget.create((ip, 161), timeout=2),
            ContextData(),
            ObjectType(ObjectIdentity('.1.3.6.1.2.1.1.5.0'))
        )
        sys_descr = str(sys_descr_var[0][1]) if not sys_descr_error and sys_descr_var else 'Unknown'
        sys_name = str(sys_name_var[0][1]) if not sys_name_error and sys_name_var else 'Unknown'
        return {'sysDescr': sys_descr, 'sysName': sys_name}
    except Exception as e:
        return {'sysDescr': 'Error', 'sysName': 'Error', 'error': str(e)}

@hosts_bp.route('/hosts', methods=['GET'])
def get_hosts():
    try:
        hosts = Host.query.all()
        return jsonify([{
            'id': host.id,
            'ip': host.ip,
            'name': host.name,
            'network_id': host.network_id,
            'snmp_available': host.snmp_available,
            'open_ports': host.open_ports
        } for host in hosts])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hosts_bp.route('/hosts/add', methods=['POST'])
def add_host():
    try:
        data = request.get_json()
        required_fields = ['ip', 'network_id']
        if not all(key in data for key in required_fields):
            return jsonify({'error': f'Missing required fields: {", ".join(set(required_fields) - set(data.keys()))}'}), 400
        
        # Verify network exists
        network = Network.query.get(data['network_id'])
        if not network:
            return jsonify({'error': 'Network not found'}), 404

        new_host = Host(
        ip=data['ip'],
        name=data.get('name', "Untitled"),
        network_id=data['network_id'],
        snmp_available=data.get('snmp_available', False),
        open_ports=json.dumps(data.get('open_ports', []))
        )

        db.session.add(new_host)
        db.session.commit()
        return jsonify({
            'id': new_host.id,
            'ip': new_host.ip,
            'name': new_host.name,
            'network_id': new_host.network_id,
            'snmp_available': new_host.snmp_available,
            'open_ports': new_host.open_ports
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@hosts_bp.route('/hosts/<int:host_id>', methods=['DELETE'])
def delete_host(host_id):
    try:
        host = Host.query.get_or_404(host_id)
        db.session.delete(host)
        db.session.commit()
        return jsonify({'message': f'Host with id {host_id} deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
@hosts_bp.route('/hosts/ping', methods=['POST'])
def ping_host():
    try:
        data = request.get_json()
        if 'ip' in data:
            ip = data['ip']
            response_time = ping(ip, timeout=2)
            state = 'online' if response_time is not None else 'offline'
            return jsonify({'ip': ip, 'state': state})
        elif 'ips' in data:
            results = []
            for ip in data['ips']:
                response_time = ping(ip, timeout=2)
                state = 'online' if response_time is not None else 'offline'
                results.append({'ip': ip, 'state': state})
            return jsonify(results)
        else:
            return jsonify({'error': 'IP address or IP list required'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@hosts_bp.route('/hosts/<int:id>/snmp', methods=['GET'])
async def get_host_snmp(id):
    try:
        host = Host.query.get_or_404(id)
        if not host.snmp_available:
            return jsonify({'error': 'SNMP not available for this host'}), 400
        details = await get_snmp_details(host.ip)
        print(details)
        return jsonify(details)
    except Exception as e:
        return jsonify({'error': str(e)}), 500