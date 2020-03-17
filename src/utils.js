import * as d3 from "d3";

const hasCases = row => {
  return row.series.filter(d => d.cases > 0).length > 0;
};

const getMaxDays = data => {
  let max = 0;
  for (const row of data) {
    if (row.series.length > max) {
      max = row.series.length;
    }
  }
  return max;
};

const getExtentKey = (data, key) => {
  let max = 0;
  let min = Number.POSITIVE_INFINITY;
  for (const row of data) {
    for (const day of row.series) {
      if (day[key] > max) {
        max = day[key];
      }
      if (day[key] < min) {
        min = day[key];
      }
    }
  }

  return [min, max];
};

const getName = item => {
  const geoUnit = item["Country/Region"];
  const subGeoUnit = item["Province/State"];
  if (geoUnit === subGeoUnit || subGeoUnit === "") {
    name = geoUnit;
  } else {
    name = `${subGeoUnit}, ${geoUnit}`;
  }
  return name;
};

const addNames = arr => {
  return arr.map(d => {
    d["name"] = getName(d);
    d["id"] = d["name"].replace(/ /g, "-");
    return d;
  });
};

const objByName = arr => {
  const obj = {};
  for (const row of arr) {
    obj[row.name] = row;
  }

  return obj;
};

const mergeData = (confirmed, deaths, recovered, events) => {
  confirmed = objByName(addNames(confirmed));
  deaths = objByName(addNames(deaths));
  recovered = objByName(addNames(recovered));

  const mergedData = Object.entries(confirmed).map(([name, cRow]) => {
    dRow = deaths[name];
    rRow = recovered[name];

    if (rRow && cRow && dRow) {
      return processRows(cRow, dRow, rRow, events);
    } else {
      console.error("MISSING VALUE FOR ", name);
    }
  });
  return mergedData;
};

const processRows = (cRow, dRow, rRow, events) => {
  const parseDate = d3.timeParse("%m/%d/%y");
  const newRow = {};
  const dailyInfo = {};
  const keys = {
    "Country/Region": true,
    Lat: true,
    Long: true,
    "Province/State": true,
    name: true,
    id: true
  };

  for (let [key, cValue] of Object.entries(cRow)) {
    if (key in keys) {
      //it is not a date string
      newRow[key] = cValue;
    } else {
      //it is a date string
      cValue = parseInt(cValue);
      dValue = parseInt(dRow[key]);
      rValue = parseInt(rRow[key]);

      key = parseDate(key);
      if (!(key in dailyInfo)) {
        dailyInfo[key] = { date: key };
      }

      dailyInfo[key]["cases"] = cValue;
      dailyInfo[key]["deaths"] = dValue;
      dailyInfo[key]["recovered"] = rValue;
      dailyInfo[key]["currentCases"] = cValue - dValue - rValue;
      dailyInfo[key]["event"] = null;
    }
  }

  //for

  //add events here
  if (newRow.name in events) {
    for (const [date, event] of Object.entries(events[newRow.name])) {
      dailyInfo[date]["event"] = event;
    }
  }

  newRow["series"] = Object.values(dailyInfo).sort((a, b) => a.date - b.date);
  return newRow;
};

const dropCasesUnder = (series, threshold) => {
  // Drop days until first case >= threshold
  // Assumes cases are in ascending date order.
  series = series.map(d => ({ ...d }));
  for (let i = 0; i < series.length; i++) {
    if (series[i].cases > threshold) {
      return series.slice(i);
    }
  }
  return [];
};

const filterData = (data, isSelected, nDays) => {
  data = data.map(d => ({ ...d }));
  return data.filter(d => isSelected[d.name]).map(d => truncateDays(d, nDays));
};

const truncateDays = (row, nDays) => {
  row = { ...row };
  row.series = row.series.slice(0, nDays);
  return row;
};

const makeIsSelected = (data, urlSelected) => {
  const isSelected = {};

  for (const row of data) {
    isSelected[row.name] = false;
  }

  for (const key of urlSelected.keys()) {
    if (key in isSelected) {
      isSelected[key] = true;
    }
  }

  return isSelected;
};

const processLockdown = data => {
  const parseDate = d3.timeParse("%Y-%m-%d");
  const nameToDates = {};
  data = data.filter(d => d["Date of action"] !== "");
  for (const item of data) {
    let name = getName(item);
    let date = parseDate(item["Date of action"]);
    let action = item["Action type"];
    if (!(name in nameToDates)) {
      nameToDates[name] = {};
    }
    nameToDates[name][date] = action;
  }
  return nameToDates;
};

const removeZeros = (data, key) => {
  return data.map(row => {
    row = { ...row };
    row.series = row.series.filter(d => d[key] !== 0);
    return row;
  });
  return data;
};

export {
  hasCases,
  getMaxDays,
  getExtentKey,
  dropCasesUnder,
  makeIsSelected,
  processLockdown,
  filterData,
  removeZeros,
  mergeData
};
