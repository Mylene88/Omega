import psycopg2
import psycopg2.extras
import geojson

conn_params = {
    "host": "xx",
    "port": "xx",
    "dbname": "xx",
    "user": "xx",
    "password": "xx"
}

geojson_file = r"C:\Users\xx\xx\xx.geojson"
schema = "xx"
table = "xx"

conn = psycopg2.connect(**conn_params)
cur = conn.cursor()

with open(geojson_file, 'r', encoding='utf-8') as f:
    gj = geojson.load(f)

insert_sql = f"""
INSERT INTO {schema}.{table} (
    nom_com, code_dep, code_insee, canton, arrondisst, popul, code_epci, nom_epci,
    maire_prenom, maire_nom, num_arrond, depute_prenom, depute_nom, geom
)
VALUES (
    %s, %s, %s, %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s,
    ST_SetSRID(ST_GeomFromGeoJSON(%s), 2154)
)
"""

for feature in gj['features']:
    p = feature['properties']
    geom = geojson.dumps(feature['geometry'])
    values = (
        p.get("NOM_COM"),
        p.get("CODE_DEP"),
        p.get("CODE_INSEE"),
        p.get("CANTON"),
        p.get("ARRONDISST"),
        p.get("POPUL"),
        p.get("CODE_EPCI"),
        p.get("NOM_EPCI"),
        p.get("maire_prenom"),
        p.get("maire_nom"),
        p.get("num_arrond"),
        p.get("depute_prenom"),
        p.get("depute_nom"),
        geom
    )
    cur.execute(insert_sql, values)

conn.commit()
cur.close()
conn.close()

print("Import GeoJSON structuré terminé avec succès.")