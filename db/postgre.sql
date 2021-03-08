-- Database: practicas

-- DROP DATABASE practicas;

use practicas;

DROP TABLE users;

CREATE TABLE users (
	id SERIAL not null,
	usuario varchar(50) not null UNIQUE,
	nombre varchar(200) not null,
	password varchar(50) not null,
	foto varchar(300) not null,
	PRIMARY KEY (id)
);

SELECT * FROM users;

INSERT INTO users(usuario,nombre,password,foto) 
	VALUES ('Zoorman', 'Zoorman Jocote', 'azorri', '/foto/foto.jpg');
