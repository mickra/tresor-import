import { findImplementation } from '../../src';
import * as sbroker from '../../src/brokers/sbroker';
import {
  buySamples,
  dividendSamples,
  allSamples,
  sellSamples,
} from './__mocks__/sbroker';

describe('Broker: sBroker', () => {
  describe('Check all documents', () => {
    test('Can the document parsed with sbroker', () => {
      allSamples.forEach(pages => {
        expect(sbroker.canParseDocument(pages, 'pdf')).toEqual(true);
      });
    });

    test('Can identify a implementation from the document as sbroker', () => {
      allSamples.forEach(pages => {
        const implementations = findImplementation(pages, 'pdf');

        expect(implementations.length).toEqual(1);
        expect(implementations[0]).toEqual(sbroker);
      });
    });
  });

  describe('Buy', () => {
    test('Can parse document: 2021_LU0323578657', () => {
      const result = sbroker.parsePages(buySamples[0]);

      expect(result.status).toEqual(0);
      expect(result.activities).toEqual([
        {
          broker: 'sBroker',
          type: 'Buy',
          date: '2021-05-21',
          datetime: '2021-05-21T' + result.activities[0].datetime.substring(11),
          isin: 'LU0323578657',
          company: 'Flossb.v.Storch-Mult.Opport. Inhaber-Anteile R o.N.',
          shares: 1.025,
          price: 294.94,
          amount: 302.31,
          fee: 0,
          tax: 0,
        },
      ]);
    });
  });

  describe('Sell', () => {
    test('Can parse document: 2021_CH0108503795', () => {
      const result = sbroker.parsePages(sellSamples[0]);

      expect(result.status).toEqual(0);
      expect(result.activities).toEqual([
        {
          broker: 'sBroker',
          type: 'Sell',
          date: '2021-06-15',
          datetime: '2021-06-15T08:33:00.000Z',
          isin: 'CH0108503795',
          company: 'Meyer Burger Technology AG Nam.-Aktien SF -,05',
          shares: 5000,
          price: 0.404,
          amount: 2020.0,
          fee: 11.02,
          tax: 0,
        },
      ]);
    });
  });

  describe('Dividend', () => {
    test('Can parse document: 2021_US4781601046', () => {
      const result = sbroker.parsePages(dividendSamples[0]);

      expect(result.status).toEqual(0);
      expect(result.activities).toEqual([
        {
          broker: 'sBroker',
          type: 'Dividend',
          date: '2021-06-08',
          datetime: '2021-06-08T' + result.activities[0].datetime.substring(11),
          isin: 'US4781601046',
          company: 'Johnson & Johnson Registered Shares DL 1',
          shares: 8,
          price: 0.8734416071325571,
          amount: 6.987532857060457,
          fee: 0,
          tax: 1.046481925526743,
          fxRate: 1.21359,
          foreignCurrency: 'USD',
        },
      ]);
    });

    test('Can parse document: 2021_DE000A2NB650', () => {
      const result = sbroker.parsePages(dividendSamples[1]);

      expect(result.status).toEqual(0);
      expect(result.activities).toEqual([
        {
          broker: 'sBroker',
          type: 'Dividend',
          date: '2021-05-26',
          datetime: '2021-05-26T' + result.activities[0].datetime.substring(11),
          isin: 'DE000A2NB650',
          company: 'Mutares SE & Co. KGaA Namens-Aktien o.N.',
          shares: 40,
          price: 1.5,
          amount: 60,
          fee: 0,
          tax: 0,
        },
      ]);
    });

    test('Can parse document: 2021_IE00B78JSG98', () => {
      const result = sbroker.parsePages(dividendSamples[2]);

      expect(result.status).toEqual(0);
      expect(result.activities).toEqual([
        {
          broker: 'sBroker',
          type: 'Dividend',
          date: '2021-08-05',
          datetime: '2021-08-05T' + result.activities[0].datetime.substring(11),
          isin: 'IE00B78JSG98',
          company: 'UBS(I)ETF-MSCI USA VALUE U.E. Reg. Shares A Dis. USD o.N.',
          shares: 4,
          price: 0.6889051254272589,
          amount: 2.7556205017090356,
          fee: 0,
          tax: 0,
          fxRate: 1.19073,
          foreignCurrency: 'USD',
        },
      ]);
    });

    test('Can parse document: 2021_US1912161007', () => {
      const result = sbroker.parsePages(dividendSamples[3]);

      expect(result.status).toEqual(0);
      expect(result.activities).toEqual([
        {
          broker: 'sBroker',
          type: 'Dividend',
          date: '2021-07-01',
          datetime: '2021-07-01T' + result.activities[0].datetime.substring(11),
          isin: 'US1912161007',
          company: 'Coca-Cola Co., The Registered Shares XX -,00',
          shares: 1,
          price: 0.35200348651072355,
          amount: 0.35200348651072355,
          fee: 0,
          tax: 0.38381035393112465,
          fxRate: 1.19317,
          foreignCurrency: 'USD',
        },
      ]);
    });
  });
});
