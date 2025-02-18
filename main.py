from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import math
import sqlite3

conn = sqlite3.connect('scores.db', check_same_thread=False)
c = conn.cursor()

c.execute('''CREATE TABLE IF NOT EXISTS data
             (number INTEGER PRIMARY KEY AUTOINCREMENT,
             name TEXT,
             score INTEGER)''')
conn.commit()

app = Flask(__name__,template_folder='templates')
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

players = {}

@app.route('/')
def index():
    return render_template('index3.html')

@socketio.on('connect')
def handle_connect():
    emit('initialize',players, broadcast=True)

@socketio.on('movement')
def handle_movement(data):
    if (request.sid in players):
        players[request.sid].update(data)
    removed_players = []

    for x in players:
        if (players[x]["alive"] == False):
            removed_players.append(x)
            name = players[x]["name"]
            score = players[x]["player_score"]
            c.execute("INSERT INTO data (name, score) VALUES (?, ?)", (name, score))
            conn.commit()

    for i in removed_players:
        players.pop(i)

    for player in players:
        q = [players[player]["x2"],players[player]["y2"]]
        size1 = players[player]["size"]

        for player2 in players:
            p = [players[player2]["x2"], players[player2]["y2"]]
            size2 = players[player2]["size"]

            if (size1 > size2):
                if (math.dist(q,p) < size1):
                    players[player2]["alive"] = False
                    players[player]["player_score"] = players[player]["player_score"]+(players[player2]["player_score"] / 2)

    emit('movement',players, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    if (request.sid in players):
        name = players[request.sid]["name"]
        score = players[request.sid]["player_score"]
        c.execute("UPDATE data SET SCORE = ? WHERE NAME=?", (score, name))
        conn.commit()

        players.pop(request.sid)

@socketio.on('initialize_player')
def handle_initialize_player(data):
    players[request.sid] = data
    name = data["name"]
    score = data["player_score"]
    c.execute("INSERT INTO data (name, score) VALUES (?, ?)", (name, score))
    conn.commit()

    emit('initialize', players, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True,allow_unsafe_werkzeug=True)