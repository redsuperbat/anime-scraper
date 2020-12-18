import { firefox as playwright } from "playwright";
import fs from "fs/promises";

async function getQuestions() {
  const browser = await playwright.launch({ headless: true });
  const page = await browser.newPage();
  const sites = (await fs.readFile("input.txt", { encoding: "utf-8" }))
    .split("\n")
    .filter((s) => !!s);
  const quizes = [];
  for await (const site of sites) {
    console.log({ site });
    await page.goto(site);
    const title = await page.$eval("h1", (el) => el.textContent);
    await page.click("#show_all_q");
    await page.waitForTimeout(2000);
    const questionNodes = await page.$$(".q");
    const questions = [];
    let counter = 1;
    for await (const node of questionNodes) {
      const question = await node.$eval(
        `#q${counter}t`,
        (el) => el.textContent
      );
      let imgUrl = null;
      try {
        imgUrl = await node.$eval(`img`, (el) => {
          console.log("hello there");
          return el.src;
        });
        console.log(imgUrl);
      } catch (e) {}
      const alternatives = await node.$$eval(".opt", (els) =>
        els.map((el) => el.textContent)
      );

      questions.push({ question, alternatives, imgUrl });
      counter += 1;
    }
    quizes.push({ site, title, questions });
  }
  fs.writeFile("quizzes.json", JSON.stringify(quizes), { encoding: "utf-8" });
  browser.close();
}

async function getAnswers() {
  const quizes = JSON.parse(
    await fs.readFile("quizzes.json", { encoding: "utf-8" })
  );
  const browser = await playwright.launch({ headless: true });
  const page = await browser.newPage();
  for await (const quiz of quizes) {
    console.log("Doing quiz", quiz.title);

    for await (const question of quiz.questions) {
      console.log("Finding answer for question", question.question);
      try {
        await page.goto(quiz.site);
      } catch (e) {}
      question.answer = await checkAllAlternatives(
        question.alternatives,
        quiz.site,
        quiz.questions.indexOf(question)
      );
      console.log(question);
    }
    appendDataToFile("results.json", quiz);
  }

  async function checkAllAlternatives(alternatives, site, questionIndex) {
    for (const alt of alternatives) {
      await page.waitForSelector("#show_all_q");
      await page.click("#show_all_q");
      const alts = await page.$$(`#q${questionIndex + 1}a >> .opt`);
      for await (const elAlt of alts) {
        const text = await elAlt.textContent();
        if (text.includes(alt)) {
          await elAlt.click();
          break;
        }
      }
      const index = alternatives.indexOf(alt);
      console.log("Trying alternative", alt, "@ index", index);

      await page.click(".qbutton");
      await page.waitForSelector("span[style='font-size:2em;']");
      const resultString = await page.$eval(
        "span[style='font-size:2em;']",
        (el) => el.textContent
      );
      const result = Number(resultString.slice(0, -1));
      console.log(result);
      if (result > 0) {
        return { alternative: alt, index };
      } else {
        try {
          await page.goto(site, { waitUntil: "networkidle" });
        } catch (e) {}
      }
    }
  }
}

async function appendDataToFile(fileName, data) {
  const json = JSON.parse(await fs.readFile(fileName, { encoding: "utf-8" }));
  json.push(data);
  await fs.writeFile(fileName, JSON.stringify(json), { encoding: "utf-8" });
}

async function main() {
  await getQuestions();
  await getAnswers();
}

main();
