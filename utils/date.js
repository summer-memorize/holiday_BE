const yyyymmddNumToDate = (num) => {
  const year = parseInt(num / 10000);
  const month = parseInt((num % 10000) / 100);
  const day = parseInt(num % 100);
  const utcDate = new Date(year, month - 1, day);
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(utcDate.getTime() + kstOffset);

  return kstDate;
};

module.exports = { yyyymmddNumToDate };
