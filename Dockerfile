# استخدم Node.js official image
FROM node:20

# مجلد العمل داخل الحاوية
WORKDIR /usr/src/app

# انسخ ملفات المشروع أولاً للتثبيت dependencies
COPY package*.json ./

# تثبيت dependencies
RUN npm install

# انسخ باقي الملفات
COPY . .

# exposed port
EXPOSE 3000

# شغل السيرفر
CMD ["node", "start.js"]
