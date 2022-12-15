import puppeteer from 'puppeteer';
import * as fs from 'fs';


const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const url = process.argv[2];
if (!url) {
  throw "Please provide a URL ebay deals url";
}

let data_folder = ''
let set_log_folder = (category) => {
  data_folder = `data/${category}`;
  fs.mkdirSync(data_folder, { recursive: true });
}

let write_data_file = (data) => {
  fs.writeFileSync(`${data_folder}.json`, JSON.stringify(data), { encoding: "utf8" });
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
    headless: false,
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
      console.log('getching products')
      const products = await page.evaluate(() => {
        let categories = ["deals_of_the_week", "hot_new_arrivals", "hot_best_seller", "trends"];
        let map = [];
        $(".col").each(function (index, item) {
          try {
            console.log(index, item);
            let obj = {};
            let data_array = item.innerText.split(/\n/);
            console.log(item.innerText, data_array)
            if (data_array.length > 1) {
              obj.data_array = data_array;

              obj._ids = $(item).children()[0].getAttribute("data-listing-id");
              obj.link = $(item).find("a")[0].href;
              obj.image = $(item).find("img")[0].src;
              obj.name = data_array[0].trim();

              obj.last_signed_price = data_array[1];
              obj.last_price = Number(data_array[1].replace("$", "").trim().replace(",", ""));

              obj.discount = 0;
              obj.pervious_price = "";
              obj.pervious_signed_price = "";

              if (data_array.length > 2) {
                let pervious_price = data_array[2].match(/\$[\d\.\,]{1,9}/g);
                if (pervious_price) {
                  obj.pervious_price = Number(pervious_price[0].replace("$", "").trim().replace(",", ""));
                  obj.pervious_signed_price = pervious_price[0];
                }
                let discount = data_array[2].match(/\d{1,3}%/g);
                if (discount) { obj.discount = Number(discount[0].replace("%", "")); }
              }
              // obj.father_category=fatherNode;
              // obj.child_category=childNode;
              // obj.site_category = site_category;

              obj.vendor = "ebay";
              obj.weight = 1;
              obj.ui_category_weight = categories[Math.round(Math.random() * 3)];
              if (!obj.image.startsWith("https://ir.ebaystatic.com"))
                map.push(obj);
            }

          } catch (err) {
            console.log(err);
          }
        });
        console.log(map);
        return map;
      });
      write_data_file(products)
      console.log(products);
      await sleep(1000);
    }
  };

  await page.screenshot({ path: 'screenshot.png' });
  browser.close();
}


run();