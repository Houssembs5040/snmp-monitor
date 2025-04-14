from flask import Blueprint, jsonify, request
from ping3 import ping
from extensions import db
from models import Network

network_bp = Blueprint('network', __name__)

def check_gateway_availability(gateway):
    try:
        response_time = ping(gateway, timeout=5)
        return 'active' if response_time is not None else 'inactive'
    except Exception as e:
        print(f"Ping error: {e}")
        return 'inactive'


@network_bp.route('/networks', methods=['GET'])
def get_networks():
    try:
        networks = Network.query.all()
        return jsonify([{
            'id': network.id,
            'name': network.name,
            'ip_range': network.ip_range,
            'gateway': network.gateway
        } for network in networks])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@network_bp.route('/networks/add', methods=['POST'])
def add_network():
    try:
        data = request.get_json()
        if not data or 'name' not in data or 'ip_range' not in data or 'gateway' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        new_network = Network(
            name=data['name'],
            ip_range=data['ip_range'],
            gateway=data['gateway']
        )
        db.session.add(new_network)
        db.session.commit()
        return jsonify({
            'id': new_network.id,
            'name': new_network.name,
            'ip_range': new_network.ip_range,
            'gateway': new_network.gateway
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@network_bp.route('/networks/<int:id>', methods=['PUT'])
def update_network(id):
    try:
        network = Network.query.get_or_404(id)
        data = request.get_json()
        network.name = data.get('name', network.name)
        network.ip_range = data.get('ip_range', network.ip_range)
        network.gateway = data.get('gateway', network.gateway)
        db.session.commit()
        return jsonify(network.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@network_bp.route('/networks/<int:id>', methods=['DELETE'])
def delete_network(id):
    try:
        network = Network.query.get_or_404(id)
        db.session.delete(network)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@network_bp.route('/networks/ping/<int:id>', methods=['GET'])
def ping_network(id):
    try:
        network = Network.query.get_or_404(id)
        status = check_gateway_availability(network.gateway)
        print(status)
        return jsonify({'id': id, 'status': status})
    except Exception as e:
        return jsonify({'error': str(e)}), 500