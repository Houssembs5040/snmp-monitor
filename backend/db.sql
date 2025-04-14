USE snmp_db;

-- Drop tables if they exist (for reset, remove if not needed)
DROP TABLE IF EXISTS dashboard_values;
DROP TABLE IF EXISTS dashboards;
DROP TABLE IF EXISTS snmpdevice;
DROP TABLE IF EXISTS host;
DROP TABLE IF EXISTS network;

-- Create the network table
CREATE TABLE IF NOT EXISTS network (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    ip_range VARCHAR(50) NOT NULL,
    gateway VARCHAR(15) NOT NULL
);

-- Create the host table
CREATE TABLE IF NOT EXISTS host (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(15) NOT NULL UNIQUE,
    name VARCHAR(50),
    network_id INT NOT NULL,
    snmp_available BOOLEAN DEFAULT FALSE,
    open_ports VARCHAR(100),
    FOREIGN KEY (network_id) REFERENCES network(id)
);

-- Create the snmpdevice table
CREATE TABLE IF NOT EXISTS snmpdevice (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(15) NOT NULL,
    read_community VARCHAR(50) NOT NULL,
    write_community VARCHAR(50) NOT NULL,
    oid VARCHAR(100) NOT NULL,
    object_name VARCHAR(100) NOT NULL,
    value VARCHAR(255)
);

-- Create dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id VARCHAR(36) PRIMARY KEY,
    device_id INT NOT NULL,
    oid VARCHAR(255) NOT NULL,
    type ENUM('graph', 'gauge') NOT NULL,
    name VARCHAR(255),
    position_x INT NOT NULL DEFAULT 0,
    position_y INT NOT NULL DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES snmpdevice(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create dashboard_values table
CREATE TABLE IF NOT EXISTS dashboard_values (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dashboard_id VARCHAR(36) NOT NULL,
    timestamp BIGINT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (dashboard_id) REFERENCES dashboards(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);