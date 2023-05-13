#! /bin/bash

export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
AWS_S3_ACCESS_KEY_ID=  \
AWS_S3_SECRET_ACCESS_KEY=  \
AWS_S3_BUCKET_NAME=  \
node cloud.js  https://ebay.com/deals
