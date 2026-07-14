#!/bin/bash

# Color codes for clean console outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}             Keepr Hızlı Başlatıcı             ${NC}"
echo -e "${BLUE}===============================================${NC}"

# 1. Start Backend in the background
echo -e "\n${GREEN}[1/3] Backend Sunucusu Hazırlanıyor...${NC}"
cd backend

if [ ! -d "venv" ]; then
    echo -e "${RED}Hata: 'backend/venv' sanal ortamı bulunamadı. Lütfen önce kurulum adımlarını tamamlayın.${NC}"
    exit 1
fi

source venv/bin/activate

# Execute DB table creation/check
python init_db.py

# Launch Flask on Port 5055 in the background
PORT=5055 python run.py &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend arka planda başlatıldı! (PID: $BACKEND_PID, Port: 5055)${NC}"

# 2. Start Frontend
echo -e "\n${GREEN}[2/3] Frontend Sunucusu Hazırlanıyor...${NC}"
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Bilgi: node_modules bulunamadı. Paketler yükleniyor...${NC}"
    npm install
fi

# 3. Inform user and start dev server
echo -e "\n${GREEN}[3/3] Sunucular Başlatılıyor!${NC}"
echo -e "${BLUE}→ Arayüze erişmek için: http://localhost:5173${NC}"
echo -e "${BLUE}→ Sunucuları durdurmak için: CTRL + C tuşlarına basın.${NC}"
echo -e "${BLUE}===============================================${NC}\n"

# Trap CTRL+C signals to kill the backend PID when user stops frontend
trap "echo -e '\n${RED}Sunucular durduruluyor...${NC}'; kill $BACKEND_PID; exit" INT

npm run dev
