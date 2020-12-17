import puppeteer from "puppeteer";
import fs from "fs/promises";

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const sites = (await fs.readFile("input.txt", { encoding: "utf-8" })).split(
    "\n"
  );
  const quizes = [];
  for await (const site of sites) {
    await page.goto(site);
    const title = await page.$eval("h1", (el) => el.textContent);
    const questionNodes = await page.$$(".q");
    const questions = [];
    let counter = 1;
    let answer = -1;
    let alternatives = [];
    for await (const node of questionNodes) {
      const question = await node.$eval(
        `#q${counter}t`,
        (el) => el.textContent
      );

      for (let i = 0; i < 4; i++) {
        alternatives = await node.$$(".opt");
        await alternatives[i].click();
        await page.click("#show_all_q");
        await page.click(".qbutton");
        await page.waitForSelector("#quizSubtitle");
        const resultString = await page.$eval(
          "#quizSubtitle",
          (el) => el.textContent
        );
        const result = Number(resultString.slice(0, -1));
        console.log(result);
        if (result > 0) {
          answer = i;
          break;
        } else {
          page.goBack();
        }
      }

      questions.push({ question, alternatives });
      counter += 1;
    }
    quizes.push({ title, questions, answer });
  }
  fs.writeFile("quizzes.json", JSON.stringify(quizes), { encoding: "utf-8" });
  browser.close();
}

main();
