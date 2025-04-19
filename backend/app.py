from flask import Flask
from flask_cors import CORS
from extensions import db

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configure SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost/snmp_db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize SQLAlchemy
    db.init_app(app)

    # Import blueprints after db initialization
    from snmp import snmp_bp
    from network import network_bp
    from hosts import hosts_bp
    from discovery import discovery_bp

    # Register blueprints
    app.register_blueprint(snmp_bp)
    app.register_blueprint(network_bp)
    app.register_blueprint(hosts_bp)
    app.register_blueprint(discovery_bp)

    # Create database tables
    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)