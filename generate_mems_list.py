import os
import json

folder = 'mems'

# Создаём папку, если её нет
if not os.path.exists(folder):
    os.makedirs(folder)
    print(f'📁 Папка "{folder}" создана. Положите туда ваши картинки.')
    files = []
else:
    extensions = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg')
    # Собираем пути и сразу заменяем обратные слэши на прямые
    files = [os.path.join(folder, f).replace('\\', '/') for f in os.listdir(folder) 
             if f.lower().endswith(extensions)]

# Сохраняем список в файл mems-list.json
with open('mems-list.json', 'w', encoding='utf-8') as f:
    json.dump(files, f, ensure_ascii=False, indent=2)

print(f'✅ Найдено {len(files)} мемов, сохранено в mems-list.json')
print('Пример пути:', files[0] if files else 'нет файлов')