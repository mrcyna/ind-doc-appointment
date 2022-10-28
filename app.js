const notifier = require('notification-for-mac');
const axios = require('axios');

async function getFirstAvailableSlot(desk) {
  const response = await axios.get(`https://oap.ind.nl/oap/api/desks/${desk}/slots/?productKey=DOC&persons=1`);

  let data = response.data;

  // Ignore the incorrect typo in the first line of data! 🤷‍
  if (btoa(data.substring(0, 6)) === 'KV19JywK') {
    data = data.substring(6)
  }

  const result = JSON.parse(data);

  if (result.status !== 'OK') {
    throw new Error('Fetched data status is not OK');
  }

  return result.data[0];
}

async function isThereAnySlotBefore(deadline, desk) {
  const firstAvailableSlot = await getFirstAvailableSlot(desk);

  if (!firstAvailableSlot) {
    return false;
  }

  if (Date.parse(firstAvailableSlot.date) <= Date.parse(deadline)) {
    return firstAvailableSlot;
  }

  return false;
}

const delay = (milliseconds) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('')
    }, milliseconds);
  })
}

const isDate = (date) => {
  return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

(async () => {
  const deadline = process.argv[2];
  const desk = process.argv[3];

  if (!isDate(deadline)) {
    console.log('⛔️ Please pass the deadline as a string like 2022-03-18!');
    process.exit(1);
  }

  if (!['AM', 'DH', 'ZW', 'DB'].includes(desk)) {
    console.log('⛔️ Please pass the desk as a valid code!');
    process.exit(2);
  }


  while (true) {
    const result = await isThereAnySlotBefore(deadline, desk);

    if (result) {
      console.log(`✅ Found an open slot at ${desk} desk on ${result.date} ${result.startTime}.`);

      notifier(`${result.date} ${result.startTime} at ${desk} Desk`, {
        title: '🗓 IND Appointment Available!',
        subtitle: `Congratulations! You can click on me and make the appointment.`,
        open: 'https://oap.ind.nl/oap/en/#/doc',
      });
    } else {
      console.log(`🔎 No slot has been found at desk ${desk} before ${deadline}. Keep looking...`);
    }

    await delay(10 * 1000);
  }

})();