from extensions import db

class Network(db.Model):
    __tablename__ = 'network'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ip_range = db.Column(db.String(50), nullable=False)
    gateway = db.Column(db.String(50), nullable=False)

class Host(db.Model):
    __tablename__ = 'host'
    id = db.Column(db.Integer, primary_key=True)
    ip = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=True)
    network_id = db.Column(db.Integer, db.ForeignKey('network.id'), nullable=False)
    network = db.relationship('Network', backref=db.backref('hosts', lazy=True))
    snmp_available = db.Column(db.Boolean, default=False)
    open_ports = db.Column(db.String(200), default='[]')


class SNMPDevice(db.Model):
    __tablename__ = 'snmpdevice'
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(15), nullable=False)
    read_community = db.Column(db.String(50), nullable=False)
    write_community = db.Column(db.String(50), nullable=False)
    oid = db.Column(db.String(100), nullable=False)
    object_name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.String(255))

class Dashboard(db.Model):
    __tablename__ = 'dashboards'
    id = db.Column(db.String(36), primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('snmpdevice.id'), nullable=False)
    device = db.relationship('SNMPDevice', backref=db.backref('dashboards', lazy=True))
    oid = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(100))
    position_x = db.Column(db.Integer, default=0)
    position_y = db.Column(db.Integer, default=0)

class DashboardValue(db.Model):
    __tablename__ = 'dashboard_values'
    id = db.Column(db.Integer, primary_key=True)
    dashboard_id = db.Column(db.String(36), db.ForeignKey('dashboards.id'), nullable=False)
    dashboard = db.relationship('Dashboard', backref=db.backref('values', lazy=True))
    timestamp = db.Column(db.BigInteger, nullable=False)
    value = db.Column(db.String(200), nullable=False)