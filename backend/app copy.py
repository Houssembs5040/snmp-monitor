import asyncio
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from pysnmp.hlapi.v3arch.asyncio import *
from pysnmp.proto.rfc1902 import OctetString, Integer32  # Import both types

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:root@localhost/snmp_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = True

db = SQLAlchemy(app)

class SNMPDevice(db.Model):
    __tablename__ = 'snmpdevice'
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(15), nullable=False)
    read_community = db.Column(db.String(50), nullable=False)
    write_community = db.Column(db.String(50), nullable=False)
    oid = db.Column(db.String(100), nullable=False)
    object_name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.String(255))

    def to_dict(self):
        return {
            'id': self.id,
            'ip_address': self.ip_address,
            'read_community': self.read_community,
            'write_community': self.write_community,
            'oid': self.oid,
            'object_name': self.object_name,
            'value': self.value
        }

with app.app_context():
    try:
        db.session.execute('SELECT 1')
        print("Database connection successful!")
        db.create_all()
        inspector = db.inspect(db.engine)
        if 'snmpdevice' in inspector.get_table_names():
            print("Table 'snmpdevice' exists and is linked.")
        else:
            print("Table 'snmpdevice' not found!")
    except Exception as e:
        print(f"Database connection failed: {str(e)}")

@app.route('/api/snmp/devices', methods=['GET'])
def get_devices():
    try:
        devices = SNMPDevice.query.all()
        return jsonify([device.to_dict() for device in devices])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/snmp/add', methods=['POST'])
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
        return jsonify(new_device.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/snmp/delete/<int:device_id>', methods=['DELETE'])
def delete_device(device_id):
    try:
        device = SNMPDevice.query.get_or_404(device_id)
        db.session.delete(device)
        db.session.commit()
        return jsonify({'message': f'Device with id {device_id} deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/snmp/get/<int:device_id>', methods=['GET'])
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
        return jsonify(device.to_dict())
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/snmp/getnext/<int:device_id>', methods=['GET'])
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
        result = []
        for varBind in varBinds:
            result.append({'oid': str(varBind[0]), 'value': str(varBind[1])})
        return jsonify({'device': device.to_dict(), 'next': result})
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/snmp/getbulk/<int:device_id>', methods=['GET'])
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
        result = []
        for varBind in varBinds:
            for oid, value in varBind:
                result.append({'oid': str(oid), 'value': str(value)})
        return jsonify({'device': device.to_dict(), 'bulk': result})
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/snmp/walk/<int:device_id>', methods=['GET'])
async def walk_request(device_id):
    try:
        device = SNMPDevice.query.get_or_404(device_id)
        result = []
        async for errorIndication, errorStatus, errorIndex, varBinds in next_cmd(
            SnmpEngine(),
            CommunityData(device.read_community),
            await UdpTransportTarget.create((device.ip_address, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(device.oid)),
            lexicographicMode=False
        ):
            if errorIndication:
                return jsonify({'error': str(errorIndication)}), 500
            if errorStatus:
                return jsonify({'error': f'{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or "?"}'}), 500
            for varBind in varBinds:
                result.append({'oid': str(varBind[0]), 'value': str(varBind[1])})
            if not varBinds:
                break
        return jsonify({'device': device.to_dict(), 'walk': result})
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/snmp/set/<int:device_id>', methods=['POST'])
async def set_request(device_id):
    try:
        device = SNMPDevice.query.get_or_404(device_id)
        data = request.get_json()
        if 'value' not in data or 'type' not in data:
            return jsonify({'error': 'Missing value or type field'}), 400
        
        value = data['value']
        value_type = data['type'].lower()
        
        # Cast value based on selected type
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
        return jsonify(device.to_dict())
    except asyncio.TimeoutError:
        return jsonify({'error': "Timed out"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)