async function test() {
  const symbol = 'DEWA.JK';
  const ranges = ['1d', '5d', '1mo'];
  const intervals = ['5m', '15m', '1d'];
  
  for(let i=0; i<ranges.length; i++) {
    const r = ranges[i];
    const int = intervals[i];
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${r}&interval=${int}`;
    const res = await fetch(url);
    const data = await res.json();
    const meta = data.chart.result[0].meta;
    console.log(`Range: ${r}`);
    console.log(`chartPreviousClose: ${meta.chartPreviousClose}`);
    console.log(`previousClose: ${meta.previousClose}`);
    console.log(`regularMarketPrice: ${meta.regularMarketPrice}`);
    console.log(`first data point close: ${data.chart.result[0].indicators.quote[0].close[0]}`);
    console.log('---');
  }
}
test();
