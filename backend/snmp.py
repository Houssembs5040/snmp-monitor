import asyncio
import uuid
from flask import Blueprint, jsonify, request
from extensions import db
from pysnmp.hlapi.v3arch.asyncio import *
from pysnmp.proto.rfc1902 import OctetString, Integer32
from models import SNMPDevice, Dashboard, DashboardValue
import logging
logger = logging.getLogger(__name__)

snmp_bp = Blueprint('snmp', __name__)

@snmp_bp.route('/snmp/devices', methods=['GET'])
def get_devices():
    try:
        devices = SNMPDevice.query.all()
        return jsonify([{
            'id': device.id,
            'ip_address': device.ip_address,
            'read_community': device.read_community,
            'write_community': device.write_community,
            'oid': device.oid,
            'object_name': device.object_name,
            'value': device.value
        } for device in devices])
    except Exception as e:
        logger.exception(e)
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/add', methods=['POST'])
def add_device():
    try:
        data = request.get_json()
        required_fields = ['ip_address', 'read_community', 'write_community', 'oid', 'object_name']
        if not all(key in data for key in required_fields):
            return jsonify({'error': f'Missing required fields: {", ".join(set(required_fields) - set(data.keys()))}'}), 400
        
        new_device = SNMPDevice(
            ip_address=data['ip_address'],
            read_community=data['read_community'],
            write_community=data['write_community'],
            oid=data['oid'],
            object_name=data['object_name']
        )
        db.session.add(new_device)
        db.session.commit()
        return jsonify({
            'id': new_device.id,
            'ip_address': new_device.ip_address,
            'read_community': new_device.read_community,
            'write_community': new_device.write_community,
            'oid': new_device.oid,
            'object_name': new_device.object_name,
            'value': new_device.value
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/delete/<int:device_id>', methods=['DELETE'])
def delete_device(device_id):
    try:
        device = SNMPDevice.query.get_or_404(device_id)
        db.session.delete(device)
        db.session.commit()
        return jsonify({'message': f'Device with id {device_id} deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/get/<int:device_id>', methods=['GET'])
async def get_request(device_id):
    try:
        device = SNMPDevice.query.get_or_404(device_id)
        errorIndication, errorStatus, errorIndex, varBinds = await get_cmd(
            SnmpEngine(),
            CommunityData(device.read_community),
            await UdpTransportTarget.create((device.ip_address, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(device.oid))
        )
        if errorIndication:
            return jsonify({'error': str(errorIndication)}), 500
        if errorStatus:
            return jsonify({'error': f'{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or "?"}'}), 500
        for varBind in varBinds:
            device.value = str(varBind[1])
        db.session.commit()
        return jsonify({
            'id': device.id,
            'ip_address': device.ip_address,
            'read_community': device.read_community,
            'write_community': device.write_community,
            'oid': device.oid,
            'object_name': device.object_name,
            'value': device.value
        })
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/set/<int:device_id>', methods=['POST'])
async def set_request(device_id):
    try:
        device = SNMPDevice.query.get_or_404(device_id)
        data = request.get_json()
        if 'value' not in data or 'type' not in data:
            return jsonify({'error': 'Missing value or type field'}), 400
        
        value = data['value']
        value_type = data['type'].lower()
        
        if value_type == 'string':
            typed_value = OctetString(value)
        elif value_type == 'integer':
            try:
                typed_value = Integer32(int(value))
            except ValueError:
                return jsonify({'error': 'Invalid integer value'}), 400
        else:
            return jsonify({'error': f'Unsupported type: {value_type}'}), 400
        
        errorIndication, errorStatus, errorIndex, varBinds = await set_cmd(
            SnmpEngine(),
            CommunityData(device.write_community),
            await UdpTransportTarget.create((device.ip_address, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(device.oid), typed_value)
        )
        
        if errorIndication:
            return jsonify({'error': str(errorIndication)}), 500
        if errorStatus:
            return jsonify({'error': f'{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or "?"}'}), 500
        
        for varBind in varBinds:
            device.value = str(varBind[1])
        db.session.commit()
        return jsonify({
            'id': device.id,
            'ip_address': device.ip_address,
            'read_community': device.read_community,
            'write_community': device.write_community,
            'oid': device.oid,
            'object_name': device.object_name,
            'value': device.value
        })
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/getnext/<int:device_id>', methods=['GET'])
async def get_next_request(device_id):
    try:
        device = SNMPDevice.query.get_or_404(device_id)
        errorIndication, errorStatus, errorIndex, varBinds = await next_cmd(
            SnmpEngine(),
            CommunityData(device.read_community),
            await UdpTransportTarget.create((device.ip_address, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(device.oid)),
            lexicographicMode=False
        )
        if errorIndication:
            return jsonify({'error': str(errorIndication)}), 500
        if errorStatus:
            return jsonify({'error': f'{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or "?"}'}), 500
        next_data = {str(varBind[0]): str(varBind[1]) for varBind in varBinds}
        return jsonify({'next': next_data})
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/bulk/<int:device_id>', methods=['GET'])
async def get_bulk_request(device_id):
    try:
        device = SNMPDevice.query.get_or_404(device_id)
        errorIndication, errorStatus, errorIndex, varBinds = await bulk_cmd(
            SnmpEngine(),
            CommunityData(device.read_community),
            await UdpTransportTarget.create((device.ip_address, 161)),
            ContextData(),
            0, 10,
            ObjectType(ObjectIdentity(device.oid))
        )
        if errorIndication:
            return jsonify({'error': str(errorIndication)}), 500
        if errorStatus:
            return jsonify({'error': f'{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or "?"}'}), 500
        bulk_data = {str(varBind[0]): str(varBind[1]) for varBind in varBinds}
        return jsonify({'bulk': bulk_data})
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/walk/<int:device_id>', methods=['GET'])
async def walk_request(device_id):
    try:
        device = SNMPDevice.query.get_or_404(device_id)
        results = {}
        async for errorIndication, errorStatus, errorIndex, varBinds in next_cmd(
            SnmpEngine(),
            CommunityData(device.read_community),
            await UdpTransportTarget.create((device.ip_address, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(device.oid)),
            lexicographicMode=False,
            maxRows=50
        ):
            if errorIndication:
                return jsonify({'error': str(errorIndication)}), 500
            if errorStatus:
                return jsonify({'error': f'{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or "?"}'}), 500
            for varBind in varBinds:
                results[str(varBind[0])] = str(varBind[1])
        return jsonify({'walk': results})
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/get-value', methods=['GET'])
async def get_snmp_value():
    try:
        ip = request.args.get('ip')
        oid = request.args.get('oid')
        read_community = request.args.get('read_community', 'public')
        if not ip or not oid:
            return jsonify({'error': 'IP and OID required'}), 400
        errorIndication, errorStatus, errorIndex, varBinds = await get_cmd(
            SnmpEngine(),
            CommunityData(read_community),
            await UdpTransportTarget.create((ip, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(oid))
        )
        if errorIndication:
            return jsonify({'error': str(errorIndication)}), 500
        if errorStatus:
            return jsonify({'error': f'{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or "?"}'}), 500
        value = str(varBinds[0][1])
        return jsonify({'value': value})
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/dashboards', methods=['GET'])
def get_dashboards():
    try:
        dashboards = Dashboard.query.all()
        return jsonify([{
            'id': d.id,
            'device_id': d.device_id,
            'device_ip': d.device.ip_address,
            'device_name': d.device.object_name,
            'read_community': d.device.read_community,
            'oid': d.oid,
            'type': d.type,
            'name': d.name,
            'position': {'x': d.position_x, 'y': d.position_y},
            'values': [{'timestamp': v.timestamp, 'value': v.value} for v in d.values]
        } for d in dashboards])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/dashboards', methods=['POST'])
def add_dashboard():
    try:
        data = request.get_json()
        if not data or 'device_id' not in data or 'oid' not in data or 'type' not in data:
            return jsonify({'error': 'Device ID, OID, and type required'}), 400
        dashboard = Dashboard(
            id=str(uuid.uuid4()),
            device_id=data['device_id'],
            oid=data['oid'],
            type=data['type'],
            name=data.get('name'),
            position_x=data.get('position', {}).get('x', 0),
            position_y=data.get('position', {}).get('y', 0)
        )
        db.session.add(dashboard)
        db.session.commit()
        return jsonify({'id': dashboard.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/dashboards/<string:id>', methods=['PUT'])
def update_dashboard(id):
    try:
        dashboard = Dashboard.query.get_or_404(id)
        data = request.get_json()
        if 'position' in data:
            dashboard.position_x = data['position'].get('x', dashboard.position_x)
            dashboard.position_y = data['position'].get('y', dashboard.position_y)
        db.session.commit()
        return jsonify({'message': 'Updated'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/dashboards/<string:id>', methods=['DELETE'])
def delete_dashboard(id):
    try:
        dashboard = Dashboard.query.get_or_404(id)
        db.session.delete(dashboard)
        db.session.commit()
        return jsonify({'message': 'Deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@snmp_bp.route('/snmp/dashboard-values', methods=['POST'])
def add_dashboard_value():
    try:
        data = request.get_json()
        if not data or 'dashboard_id' not in data or 'timestamp' not in data or 'value' not in data:
            return jsonify({'error': 'Dashboard ID, timestamp, and value required'}), 400
        value = DashboardValue(
            dashboard_id=data['dashboard_id'],
            timestamp=data['timestamp'],
            value=str(data['value'])
        )
        db.session.add(value)
        db.session.commit()
        return jsonify({'id': value.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500