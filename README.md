Some small scrapper example with [puppeteer](https://github.com/puppeteer/puppeteer).

Just recreating some of old source ebay deals code scrapping with puppeteer.

requirment node.js

run: 

        npm istall
        node index.js  https://ebay.com/deals


Ebay implemented new feature for blocking constant crowling, it appears for couple of secomds as window and affect some prodcut data.
so all sleep behaviour has to be randomized first, second it has to run slowly, also this window can be easily caught, and pause process till it will dissaper.
otherwise couple of categories will be empty.
