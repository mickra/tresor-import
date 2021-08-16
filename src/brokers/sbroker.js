import { Big } from 'big.js';
import {
  parseGermanNum,
  validateActivity,
  createActivityDateTime,
} from '@/helper';
import * as onvista from './onvista';

const findLineNumberByTwoLines = (content, firstLine, secondLine) => {
  let lastLineNumber = 0;

  while (true) {
    let lineNumber = content
      .slice(lastLineNumber)
      .findIndex(line => line === firstLine);

    if (lineNumber <= 0) {
      return;
    }

    lineNumber += lastLineNumber;
    if (content[lineNumber + 1] === secondLine) {
      return lineNumber;
    }

    lastLineNumber = lineNumber + 1;
  }
};

const isBuy = content => {
  return (
    findLineNumberByTwoLines(content, 'Wertpapierabrechnung', 'Kauf') !==
    undefined
  );
};

const isSell = content => {
  return (
    findLineNumberByTwoLines(content, 'Wertpapierabrechnung', 'Verkauf') !==
    undefined
  );
};

const isDividend = content =>
  content.some(line => line.includes('Dividendengutschrift')) ||
  content.some(line => line.includes('gnisgutschrift aus Wertpapieren'));

const getDocumentType = content => {
  if (isBuy(content)) {
    return 'Buy';
  } else if (isSell(content)) {
    return 'Sell';
  } else if (isDividend(content)) {
    return 'Dividend';
  }
};

export const canParseDocument = (pages, extension) => {
  const firstPageContent = pages[0];

  return (
    extension === 'pdf' &&
    firstPageContent.some(line => line.includes('SBROKER')) &&
    getDocumentType(firstPageContent) !== undefined
  );
};

const findPrice = (content, fxRate = undefined) => {
  const price = parseGermanNum(
    content[content.findIndex(line => line.includes('Kurs')) + 2]
  );

  if (fxRate === undefined) {
    return price;
  }

  return +Big(price).div(fxRate);
};

const findCompany = content => {
  const lineNumber = content.indexOf('Gattungsbezeichnung');
  const isinLineNumber = content.findIndex(line => line.includes('ISIN'));

  if (lineNumber < 0) {
    return content[isinLineNumber - 1];
  }

  return content.slice(lineNumber + 1, isinLineNumber).join(' ');
};

const findShares = content => {
  const lineNumber = content.findIndex(line => line.includes('STK'));
  if (content[lineNumber].includes(' ')) {
    return parseGermanNum(content[lineNumber].split(' ')[1]);
  }

  return parseGermanNum(content[lineNumber + 1]);
};

const findPayout = (content, fxRate = undefined) => {
  let lineNumber = content.indexOf('Dividenden-Betrag');
  let payoutOffset = 5;

  if (lineNumber < 0) {
    lineNumber = content.indexOf('ttungsbetrag pro St');
    payoutOffset = 3;

    if (lineNumber < 0) {
      return undefined;
    }
  }

  let payoutValue = content[lineNumber + payoutOffset];
  if (!payoutValue.includes(' ')) {
    payoutValue = content[lineNumber + payoutOffset + 1];
  } else {
    payoutValue = content[lineNumber + payoutOffset].split(' ')[1];
  }

  const payout = parseGermanNum(payoutValue);
  if (fxRate === undefined) {
    return payout;
  }

  return +Big(payout).div(fxRate);
};

const findForeignInformation = content => {
  const lineNumber = content.indexOf('Devisenkurs');
  if (lineNumber < 0) {
    return [undefined, undefined];
  }

  let currency, fxValue;
  if (!content[lineNumber + 1].includes(' ')) {
    currency = content[lineNumber + 1].split(/\//)[1];
    fxValue = content[lineNumber + 2];
  } else {
    const line = content[lineNumber + 1].split(' ');
    currency = line[0].split(/\//)[1];
    fxValue = line[1];
  }

  return [currency, parseGermanNum(fxValue)];
};

const findFee = content => {
  let total = Big(0);

  const orderFeeLineNumber = content.indexOf('Orderentgelt');
  if (orderFeeLineNumber >= 0) {
    total = total.add(parseGermanNum(content[orderFeeLineNumber + 2]));
  }

  return +total;
};

const findTax = (content, fxRate = undefined) => {
  let total = Big(0);

  {
    // withholding tax
    const lineNumber = content.findIndex(line =>
      line.endsWith('-Quellensteuer')
    );
    if (lineNumber >= 0) {
      total = total.add(
        Big(parseGermanNum(content[lineNumber + 3])).div(fxRate)
      );
    }
  }

  {
    // Kapitalertragsteuer
    const lineNumber = findLineNumberByTwoLines(
      content,
      'einbehaltene',
      'Kapitalertragsteuer'
    );
    if (lineNumber !== undefined) {
      total = total.add(Big(parseGermanNum(content[lineNumber + 3])));
    }
  }

  {
    // Solidaritätszuschlag
    const lineNumber = findLineNumberByTwoLines(
      content,
      'einbehaltener',
      'Solidarit'
    );
    if (lineNumber !== undefined) {
      total = total.add(Big(parseGermanNum(content[lineNumber + 5])));
    }
  }

  {
    // Kirchensteuer
    const lineNumber = findLineNumberByTwoLines(
      content,
      'einbehaltene',
      'Kirchensteuer'
    );
    if (lineNumber !== undefined) {
      total = total.add(Big(parseGermanNum(content[lineNumber + 3])));
    }
  }

  return +total;
};

const parseBuySellDividend = (pages, type) => {
  const content = pages.flat();

  let activity = {
    broker: 'sBroker',
    type,
    shares: findShares(content),
    isin: onvista.findISIN(content),
    company: findCompany(content),
    fee: findFee(content),
  };

  let date;
  const time = onvista.findOrderTime(content);
  const [foreignCurrency, fxRate] = findForeignInformation(content);

  if (activity.type === 'Buy' || activity.type === 'Sell') {
    activity.amount = onvista.findAmount(content);
    activity.price = findPrice(content, fxRate);
    date = onvista.findDateBuySell(content);
  } else if (activity.type === 'Dividend') {
    date = onvista.findDateDividend(content);
    activity.price = findPayout(content, fxRate);
    activity.amount = +Big(activity.price).times(activity.shares);
  }

  activity.tax = findTax(content, fxRate);
  [activity.date, activity.datetime] = createActivityDateTime(date, time);

  if (fxRate !== undefined) {
    activity.fxRate = fxRate;
  }

  if (foreignCurrency !== undefined) {
    activity.foreignCurrency = foreignCurrency;
  }

  return [validateActivity(activity)];
};

export const parsePages = pages => {
  const type = getDocumentType(pages[0]);
  switch (type) {
    case 'Buy':
    case 'Sell':
    case 'Dividend':
      return {
        activities: parseBuySellDividend(pages, type),
        status: 0,
      };

    default:
      return {
        activities: undefined,
        status: 5,
      };
  }
};
