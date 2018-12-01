const express = require("express");
const puppeteer = require('puppeteer');
const fs = require('fs');

class Main {
    init() {
        this.skus = [
            // "8712117110788",
            // "8719323038349",
            // "8718053679549",
            // "8718053672526",
            // "8718053677521",
            // "8719323034044",
            // "8718053677958",
            // "8719323037359",
            // "8718858075485",
            // "8718053679570",
            // "8718053671819",
            // "8718053671901",
            // "8718053671918",
            // "8719743060395",
            // "8719743060487",
            // "8718053677972",
            // "8712117110788",
            // "8719323038349",
            // "8718053679549",
            // "8718053672526",
            // "8718053677521",
            // "8719323034044",
            // "8718053677958",
            // "8719323037359",
            // "8718858075485",
            // "8718053679570",
            // "8718053671819",
            // "8718053671901",
            // "8718053671918",
            // "8719743060395",
            // "8719743060487",
            // "8718053677972",
            // "8712117110788",
            // "8719323038349",
            // "8718053679549",
            // "8718053672526",
            // "8718053677521",
            // "8719323034044",
            // "8718053677958",
            // "8719323037359",
            // "8718858075485",
            // "8718053679570",
            // "8718053671819",
            // "8718053671901",
            // "8718053671918",
            // "8719743060395",
            // "8719743060487",
            // "8718053677972",
            // "8712117110788",
            // "8719323038349",
            // "8718053679549",
            // "8718053672526",
            // "8718053677521",
            // "8719323034044",
            // "8718053677958",
            // "8719323037359",
            // "8718858075485",
            // "8718053679570",
            // "8718053671819",
            // "8718053671901",
            // "8718053671918",
            // "8719743060395",
            // "8719743060487",
            // "8718053677972",
            // "8712117110788",
            // "8719323038349",
            // "8718053679549",
            // "8718053672526",
            // "8718053677521",
            // "8719323034044",
            // "8718053677958",
            // "8719323037359",
            // "8718858075485",
            // "8718053679570",
            // "8718053671819",
            // "8718053671901",
            // "8718053671918",
            // "8719743060395",
            "8719743060487",
            // "8718053677972"
        ];

        this.app = express();
        this.port = 3001;

        this.app.get('*.*', express.static(process.cwd() + '/prices', {maxAge: 160000}));


        this.app.use("/", (req, res) => {
            res.send("works");
        });

        fs.readFile(process.cwd() + '/ean_check.csv', 'utf8', async (err, data) => {
            if (err) throw err;
            if (data) {

                // this.skus = data.split("\n").slice(1).map((str) => "0" + str.split(";")[1]).filter(sku => sku.length > 1).slice(0, 1);

                console.log(this.skus);

                this.browser = await puppeteer.launch({pipe: true}).catch(e => {
                    console.log(e);
                });

                this.save();
            }

        });

        this.start();
    }

    save() {

        this.endCount = this.skus.length;
        console.log("Start doing", this.endCount, "sku's");
        this.count = 0;
        // this.saveJson(this.skus[0]);
        this.skus.forEach(this.saveJson.bind(this))
    }

    getSku() {
        console.log("Works!");
    }

    find(query, prop, search) {
        return [].slice.call(document.querySelectorAll(query)).find(elm => elm.getAttribute(prop) === search).innerText;
    }

    async saveJson(sku) {
        let error = false;

        const page = await this.browser.newPage();
        await page.goto("http://google.nl");
        await page.type('input[name="q"]', sku);

        console.log("Started step 1");

        await page.keyboard.down('Enter').catch(() => {
            error = true;
            page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
        });


        if (!error) {
            console.log("Started step 2");

            await page.waitForSelector("#top_nav");

            await page.evaluate(() => {
                return [].slice.call(document.querySelectorAll("#top_nav a")).find(a => a.innerText.includes("Shopping")).click()
            }).catch((e) => {
                error = true;
                page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
            });


            console.log("Started step 3");

            await page.waitForSelector("#rcnt");
            await page.click('#rcnt a.vjtvke').catch(e => {
                error = true;
            });

            if (!error) {
                await page.waitForSelector("#search");
                await page.click("#search a").catch(() => {
                    error = true;

                    console.log(`error step 3, ${sku}`);
                    page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
                });


                if (!error) {
                    await page.waitFor("#rcnt");

                    await page.evaluate(() => {
                        return [].slice.call(document.querySelectorAll("a")).find(a => a.innerText.includes("Nieuwe artikelen")).click()
                    }).catch((e) => {
                        error = true;
                        console.log(`error step 4, ${sku}`);
                        page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
                    });

                    // await page.evaluate(() => {
                    //     [].slice.call(document.querySelectorAll("a")).find(a => a.innerText.includes("Prijzen vergelijken")).click()
                    // }).catch(() => {
                    //     error = true;
                    //
                    //     console.log(`error step 4, ${sku}`);
                    //     page.screenshot({path: process.cwd() + `/errors/error-${sku}.png`, fullPage: true});
                    // });


                    if (!error) {
                        await page.waitFor(2000);

                        const prices = await page.evaluate(() =>
                            [].slice.call(document.querySelectorAll('.os-row')).map(elm =>
                                Object.assign({
                                    href: elm.querySelector(".os-seller-name a").innerText,
                                    price: elm.querySelector(".os-total-col").innerText
                                })
                            )
                        );

                        fs.writeFile(process.cwd() + `/prices/${sku}.json`, JSON.stringify(prices.map(price => Object.assign(price, {date: new Date()}))), (err) => {
                            if (err) {
                                return console.log(err);
                            }

                            // this.next();
                            console.log(`Saved ${sku}`);
                        });

                    }

                }
            }
        }
    }


    next() {
        this.count++;

        if (this.count < this.endCount) {
            this.saveJson(this.skus[this.count]);
        }
    }

    start() {
        this.app.listen(this.port, "0.0.0.0", () => {
            console.log(`Listening on: ${this.port}`);
        })
    }
}

new Main().init();