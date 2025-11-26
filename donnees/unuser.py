import psycopg2
import bcrypt
from datetime import datetime

# Paramètres de connexion
dbname = "omega"
user_db = "postgres"
password_db = "postgres"
host = "localhost"
port = 5432

schema = "principale"
table = "user"

# Données de l'utilisateur à ajouter
nom = "test"
prenom = "test"
username = "test.test"
password_plain = "Omega-28!"
role_id = 2  # Remplacer par l'ID du rôle approprié

# Connexion à PostgreSQL
conn = psycopg2.connect(
    dbname=dbname,
    user=user_db,
    password=password_db,
    host=host,
    port=port
)
cur = conn.cursor()

# Hachage du mot de passe
password_hash = bcrypt.hashpw(password_plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Requête d'insertion
query = f'''
    INSERT INTO "{schema}"."{table}" (nom, prenom, username, password_hash, first_login, role_id)
    VALUES (%s, %s, %s, %s, %s, %s)
'''

# Exécution de l'insertion
cur.execute(query, (nom, prenom, username, password_hash, True, role_id))

conn.commit()
print("Utilisateur ajouté avec succès")
cur.close()
conn.close()
