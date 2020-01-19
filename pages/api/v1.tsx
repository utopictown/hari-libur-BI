import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer, { ElementHandle } from 'puppeteer'
import moment from 'moment';

const listMonths = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

const inversedMonths = [];
listMonths.forEach((v, i) => {
  inversedMonths[v]= i
})

let response: DayoffResponse = {
  data: new Array(),
  footNote: new Array(),
  author: new String(),
  loadTime: new Number(),
}

interface DayoffResponse {
  data: Array<object>,
  footNote: Array<string>,
  author: String,
  loadTime: Number,
}

interface Result {
  date: number,
  dateString: string,
  day: string,
  info: string,
  desc: string
}

const load = async () => {
  const initTime = new Date();
  let data = new Array();
  let footNote = new Array();
  const currentYear = new Date().getFullYear();
  const browser = await puppeteer.launch({timeout: 0});
  const page = await browser.newPage();
  await page.goto(`https://www.bi.go.id/id/ruang-media/agenda/kalender-hari-libur/Contents/Kalender-Libur-${currentYear}.aspx`);
  const oddRowHandles = await page.$$('.ms-rteTableOddRow-6');
  const evenRowHandles = await page.$$('.ms-rteTableEvenRow-6');
  const footNoteHandle = await page.$('p.ms-rteFontSize-1');
  const footNoteValue = await evaluateInnerHTML(footNoteHandle);
  footNote = footNoteValue.split('<br>\n');
  const rowHandles = [oddRowHandles, evenRowHandles];
  const iteratedRows = rowHandles.map(async row => {
      const iteratedRow = row.map(async evenRowHandle => {
        const dateElem = await evenRowHandle.$('.ms-rteTableFirstCol-6')
        const dateValue = await evaluateInnerHTML(dateElem)
        const evenElem = await evenRowHandle.$$('td.ms-rteTableOddCol-6')
        const dayValue = await evaluateInnerHTML(evenElem[0])
        const infoElem = await evenRowHandle.$('.ms-rteTableEvenCol-6')
        const infoValue = await evaluateInnerHTML(infoElem)
        const descValue = await evaluateInnerHTML(evenElem[1])
        const _infoValue = infoValue.replace(/(&nbsp;)/g, '');
        const _dateValue = dateValue.replace(/(&nbsp;)/g, ' ');
        const splittedDate = _dateValue.split(' ');
        const date = parseInt(splittedDate[0].replace('​', '')); // purge weird zero width space character
        const month = inversedMonths[splittedDate[1]];
        const year = parseInt(splittedDate[2].replace('​', '')); // purge weird zero width space character

        return {
          dateString: moment(`${year}-${month+1}-${date}`).locale('id').format('DD MMMM YYYY'),
          date: moment(`${year}-${month+1}-${date}`),
          day: moment(`${year}-${month+1}-${date}`).locale('id').format('dddd'),
          info: _infoValue,
          desc: descValue,
        }
      })
    
      return await Promise.all(iteratedRow)
  })
  const values = await Promise.all(iteratedRows);

  await browser.close();

  data = [].concat.apply([], values);
  data = data.sort((a: Result, b: Result) => a.date - b.date)

  return { data, footNote, initTime };
}

const evaluateInnerHTML = async (element: ElementHandle) => {
  return await element.evaluate(elem => elem.innerHTML, element);
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const loadedDayoff = await load()
  response.data = loadedDayoff.data
  response.footNote = loadedDayoff.footNote
  response.author = 'https://github.com/prstyocode'
  response.loadTime = moment().diff(loadedDayoff.initTime, 'seconds', true)
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(response))
}