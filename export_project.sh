#!/bin/bash
# Скрипт для экспорта проекта в папку Загрузки

# Устанавливаем директорию назначения
DEST_DIR="$HOME/Downloads/MyProjectArchive"

# Создаем папку назначения, если она не существует
mkdir -p "$DEST_DIR"

# Копируем все файлы проекта, сохраняя структуру
# Копируем основные конфигурационные файлы
cp apphosting.yaml "$DEST_DIR/"
cp components.json "$DEST_DIR/"
cp dnd-kit-sortable.d.ts "$DEST_DIR/"
cp next.config.ts "$DEST_DIR/"
cp package.json "$DEST_DIR/"
cp README.md "$DEST_DIR/"
cp tailwind.config.ts "$DEST_DIR/"
cp tsconfig.json "$DEST_DIR/"

# Копируем папки
cp -R src "$DEST_DIR/src"
cp -R docs "$DEST_DIR/docs"

echo "Проект успешно экспортирован в папку: $DEST_DIR"
echo "Вы можете найти ее в своих Загрузках под названием MyProjectArchive."
