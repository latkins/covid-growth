import * as d3 from 'd3';

const hasCases = (row) => {
  return row.cases.filter((d) => d.count > 0).length > 0;
};

const getNDays = (data) => {
  return 52;
};

const getMaxCases = (data) => {
  let max = 0;
  for (const row of data) {
    for (const day of row.cases) {
      if (day.count > max) {
        max = day.count;
      }
    }
  }
  return max;
};

const tidyData = (row) => {
  const newRow = {};
  const dailyCases = [];
  const keys = ['Country/Region', 'Lat', 'Long', 'Province/State'];
  const parseDate = d3.timeParse('%m/%d/%y');
  for (const [key, value] of Object.entries(row)) {
    if (keys.includes(key)) {
      newRow[key] = value;
    } else {
      dailyCases.push({date: parseDate(key), count: parseInt(value)});
    }
  }
  newRow['cases'] = dailyCases.sort((a, b) => a.date - b.date);

  return newRow;
};

const dropCasesUnder = (cases, threshold) => {
  // Drop days until first case >= threshold
  // Assumes cases are in ascending date order.
  for (let i = 0; i < cases.length; i++) {
    if (cases[i].count > threshold) {
      return cases.slice(i);
    }
  }
  return [];
};

export {hasCases, getNDays, getMaxCases, tidyData, dropCasesUnder};
