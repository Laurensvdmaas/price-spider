const express = require("express");
const puppeteer = require('puppeteer');
const fs = require('fs');

class Main {
    init() {
        this.skus = [
            "8712117110788",
            "8719323038349",
            "8718053679549",
            "8718053672526",
            "8718053677521",
            "8719323034044",
            "8718053677958",
            "8719323037359",
            "8718858075485",
            "8718053679570",
            "8718053671819",
            "8718053671901",
            "8718053671918",
            "8719743060395",
            "8719743060487",
            "8718053677972"
        ];

        this.app = express();
        this.port = 3001;

        this.app.get('*.*', express.static(process.cwd() + '/prices', {maxAge: 160000}));


        this.interval = (process.env.INTERVAL || 5 * 60) * 1000;
        this.rate = process.env.RATE || 5;

        console.log(this.interval);

        this.app.use("/", (req, res) => {
            res.send("works");
        });

        fs.readFile(process.cwd() + '/ean_check.csv', 'utf8', async (err, data) => {
            if (err) throw err;
            if (data) {

                this.skus = data.split("\n").slice(1).map((str) => "0" + str.split(";")[1]).filter(sku => sku.length > 1).slice(0, 1);

                this.browser = await puppeteer.launch({pipe: true}).catch(e => {
                    console.log(e);
                });

                this.save();
            }

        });

        this.start();
    }

    save() {

        this.errors = [];
        this.success = [];

        this.endCount = this.skus.length;
        console.log("Start doing", this.endCount, `sku's, every ${this.interval / 1000 / 60 } minutes ${this.rate} sku's`);
        this.count = 0;
        // this.saveJson(this.skus[0]);
        this.skus.slice(0, this.rate).forEach(this.saveJson.bind(this))
    }

    getSku() {
        console.log("Works!");
    }

    find(query, prop, search) {
        return [].slice.call(document.querySelectorAll(query)).find(elm => elm.getAttribute(prop) === search).innerText;
    }

    async saveJson(sku) {
        let error = false;

        console.log(`Start: ${sku}`);

        const page = await this.browser.newPage();
        await page.goto("http://google.nl");
        await page.type('input[name="q"]', sku);

        console.log("Started step 1");

        await page.keyboard.down('Enter').catch(() => {
            error = true;
            this.next(sku);
            console.log(`error step 1, ${sku}`);
            page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
        });


        if (!error) {
            console.log("Started step 2");

            await page.waitForSelector("#top_nav");

            await page.evaluate(() => {
                return [].slice.call(document.querySelectorAll("#top_nav a")).find(a => a.innerText.includes("Shopping")).click()
            }).catch((e) => {
                error = true;
                console.log(`error step 2, ${sku}`);
                this.next(sku);
                page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
            });


            if (!error) {
                console.log("Started step 3");
                await page.waitForSelector("#rcnt");
                await page.click('#rcnt a.vjtvke').catch(e => {
                    error = true;
                    console.log(`error step 3, ${sku}`);
                    page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
                    this.next(sku);
                });

                if (!error) {
                    console.log("Started step 4");
                    await page.waitForSelector("#search");
                    await page.click("#search a").catch(() => {
                        error = true;
                        console.log(`error step 4, ${sku}`);
                        this.next(sku);
                        page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
                    });


                    if (!error) {
                        console.log("Started step 5");
                        await page.waitForSelector("#rcnt");
                        await page.evaluate(() => {
                            return [].slice.call(document.querySelectorAll("a")).find(a => a.innerText.includes("Nieuwe artikelen")).click()
                        }).catch((e) => {
                            error = true;
                            this.next(sku);
                            console.log(`error step 5, ${sku}`);
                            page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
                        });

                        if (!error) {
                            await page.waitFor(2000);

                            console.log("Started step 6");

                            page.screenshot({path: process.cwd() + `/errors/test-3.png`, fullPage: true});

                            const prices = await page.evaluate(() =>
                                [].slice.call(document.querySelectorAll('.os-row')).map(elm =>
                                    Object.assign({
                                        href: elm.querySelector(".os-seller-name a").innerText,
                                        price: elm.querySelector(".os-price-col span:first-child").innerText
                                    })
                                )
                            ).catch(() => {
                                error = true;
                                this.next(sku);
                                console.log(`error step 7, ${sku}`);
                                page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
                            });

                            if(prices) {
                                fs.writeFile(process.cwd() + `/prices/${sku}.json`, JSON.stringify(prices.map(price => Object.assign(price, {date: new Date()}))), (err) => {
                                    if (err) {
                                        return console.log(err);
                                    }

                                    this.next(false, sku);
                                    // this.next();
                                    console.log(`Saved ${sku}`);
                                });

                            }
                        }

                    }

                }
            }
        }
    }


    next(error, success) {
        this.count++;

        console.log(this.count);

        if (this.count % this.rate === 0 && this.count !== this.endCount) {
            setTimeout(() => {
                console.log("Should do next one");
                this.skus.slice(this.count, this.count + this.rate).forEach(this.saveJson.bind(this));

            }, 2000);
        }

        if (error) this.errors.push(error);

        if (success) this.success.push(success);

        if (this.count === this.endCount) {
            console.log("DONE..");
            console.log("Errors", this.errors.length);
            console.log("Success", this.success.length);
        }
    }

    start() {
        this.app.listen(this.port, "0.0.0.0", () => {
            console.log(`Listening on: ${this.port}`);
        })
    }
}

new Main().init();