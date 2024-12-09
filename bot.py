from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import logging

# Настройки
DB_PATH = "telegram.db"
app = Flask(__name__)
CORS(app)

def init_db():
    """Создает таблицу, если её ещё нет"""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT,
            points INTEGER DEFAULT 0
        )
        """)
        conn.commit()

def update_user(user_id, username, points=0):
    """Добавляет нового пользователя или обновляет его данные"""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO users (id, username, points)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET username = excluded.username, points = excluded.points
        """, (user_id, username, points))
        conn.commit()

def get_user_data(user_id):
    """Получает данные пользователя из базы"""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, points FROM users WHERE id = ?", (user_id,))
        return cursor.fetchone()

# Новый маршрут для обновления очков
@app.route('/edit_points', methods=['POST'])
def edit_points():
    """
    Обновляем очки пользователя.
    Проверяем все входящие данные перед обработкой.
    """
    try:
        # Логируем входящие данные
        data = request.get_json()
        print("Данные, полученные от клиента:", data)

        # Проверяем, есть ли все ключи и корректны ли данные
        if not data or 'user_id' not in data or 'points' not in data:
            print("Ошибка: данные некорректны или отсутствуют")
            return jsonify({"status": "error", "message": "Данные некорректны или отсутствуют"}), 400

        # Проверяем, что данные можно преобразовать в числа
        user_id = int(data['user_id'])
        points = int(data['points'])

        # Обновляем данные в базе
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET points = ? WHERE id = ?", (points, user_id))
            conn.commit()

        # Ответ после успешного обновления данных
        print("Очки успешно обновлены в БД")
        return jsonify({"status": "success", "message": "Points updated successfully"}), 200

    except Exception as e:
        # Логируем ошибки
        print("Ошибка при обновлении данных:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/get_users', methods=['GET'])
def get_users():
    """Возвращает список всех пользователей из базы данных."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, points FROM users")
        users = cursor.fetchall()
        return jsonify([{"id": u[0], "username": u[1], "points": u[2]} for u in users])

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=8000)
