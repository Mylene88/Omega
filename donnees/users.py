import csv
import psycopg2
import bcrypt
from datetime import datetime

csv_file = r"C:\Users\yogukouamy\Downloads\annuaire_modifie.csv"
schema = "principale"
table = "user"

# Connexion à PostgreSQL
conn = psycopg2.connect(
    dbname="omega",
    user="postgres",
    password="postgres",
    host="localhost",  # change si besoin
    port=5433
)
cur = conn.cursor()

query = f'''
    INSERT INTO "{schema}"."{table}" (nom, prenom, username, password_hash, first_login, role_id)
    VALUES (%s, %s, %s, %s, %s, %s)
'''

with open(csv_file, newline='', encoding='utf-8') as csvfile:
    lecteur = csv.DictReader(csvfile)
    for ligne in lecteur:
        nom = ligne['Nom']
        prenom = ligne['Prenom']
        username = ligne['username']
        password_plain = "Omega-28!"
        password_hash = bcrypt.hashpw(password_plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        first_login = True

        # Récupération du role_id depuis le CSV (converti en int)
        role_id = int(ligne['role_id']) if ligne.get('role_id') else None
        cur.execute(query, (nom, prenom, username, password_hash, first_login, role_id))

conn.commit()
print("OK")
cur.close()
conn.close()