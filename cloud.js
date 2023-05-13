import puppeteer from 'puppeteer';
import * as fs from 'fs';
import AWS from 'aws-sdk'



const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
});

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const url = process.argv[2];
const isHeadless = process.argv[3];
if (!url) {
  throw "Please provide a URL ebay deals url";
}

let data_folder = ''
let set_log_folder = (category) => {
  data_folder = `data/${category}`;
}

let write_data_file = (data) => {
  console.log(`${data_folder}`)
  fs.writeFileSync(`${data_folder}.json`, JSON.stringify(data), { encoding: "utf8" });
}

let uploadFiletoS3 =  (file,data_folder) =>{
  console.log('s3 upload file',`${data_folder.replace(/\s+/g, "_")}.json`);
  return s3.upload({
  Bucket: process.env.AWS_S3_BUCKET_NAME,
  Key: `${data_folder.replace(/\s+/g, "_")}.json`,
  Body: Buffer.from(JSON.stringify(file)),
  ContentEncoding: 'base64',
  ContentType: 'application/json',
}).promise()
}


async function run() {
  const browser = await puppeteer.launch({
    args: [
      '--ignore-certificate-errors',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      "--disable-accelerated-2d-canvas",
      "--disable-gpu"],
    ignoreHTTPSErrors: true,
    headless: isHeadless,
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' })

  const arrayOfLinks = await page.evaluate(() => {
    const $ = window.$;
    var arr = []
    $('nav ul li').each((k, v) => {
      var cur = {};
      cur._ids = $(v).find("a")[0].href;
      cur.father = cur._ids.split("/").pop();
      cur.address = cur._ids;
      cur.children = [];
      $(v).find('div a').each((k, v) => {
        var child = {};
        child.address = v.href.replace("#", "/");
        child._ids = v.text;
        cur.children.push(child)
      });
      arr.push(cur);
    });
    return arr;
  });

  for (const father of arrayOfLinks) {
    console.log(father)
    for (const child of father.children) {
      console.log(child);
      await page.goto(child.address);
      // nothing is better than jquey injection.
      set_log_folder(child._ids)
      await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });

      for (const i of [1, 2, 3, 4, 5, 6, 7]) {
        await sleep(500);
        console.log(i);
        await page.evaluate(() => {
          $('html, body').animate({ scrollTop: $(document).height() - $(window).height() });
        })
        await sleep(600);
        await page.evaluate(() => {
          $('.load-more-btn').click();
        });
      }
      console.log('fetching products')
      const products = await page.evaluate(() => {
        let map = [];
        $(".col").each(function (index, item) {
          try {
            console.log(index, item);
            let obj = {};
            let data_array = item.innerText.split(/\n/);
            console.log(item.innerText, data_array)
            if (data_array.length > 1) {
              obj.data_array = data_array;

              obj.item_id = $(item).children()[0].getAttribute("data-listing-id");
              obj.link = $(item).find("a")[0].href;
              obj.image_url = $(item).find("img")[0].src;
              obj.title = data_array[0].trim();

              obj.price_signed = data_array[1];
              obj.price = Number(data_array[1].replace("$", "").trim().replace(",", ""));

              obj.vendor = "ebay";
              obj.weight = 1;
              if (!obj.image_url.startsWith("https://ir.ebaystatic.com"))
                map.push(obj);
            }
          } catch (err) {
            console.log(err);
          }
        });
        return map;
      });
      await uploadFiletoS3(products,data_folder)
      //console.log(products);
      await sleep(1000);
    }
  };

  await page.screenshot({ path: 'screenshot.png' });
  browser.close();
}


run();