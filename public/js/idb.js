let db;

function idbConnect() {
  const request = indexedDB.open('budget_tracker', 1);

  request.onupgradeneeded = function (event) {
    // save a reference to the database
    const db = event.target.result;
    // create an object store (table) called `transaction`, set it to have an auto incrementing primary key of sorts 
    db.createObjectStore('budget', { autoIncrement: true });
  };

  request.onerror = function (event) {
    // log error here
    console.log(event.target.errorCode);
  };

  // upon successful db connection
  request.onsuccess = function (event) {
    // when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
    db = event.target.result;

    // check if app is online, if yes run idbSyncTransactions() function to send all local db data to api
    if (navigator.onLine) {
      idbSyncTransactions();
    }
  };

  return request;
}

function idbSaveRecord(record) {
  console.log('saving record in indexedDB', record);

  // open a new transaction with the database with read and write permissions 
  const transaction = db.transaction(['budget'], 'readwrite');

  // access the object store for `new_pizza`
  const budgetObjectStore = transaction.objectStore('budget');

  // add record to the store with add method
  budgetObjectStore.add(record);
}

function idbSyncTransactions() {
  // open a transaction on db
  const transaction = db.transaction(['budget'], 'readwrite');

  // access the object store
  const budgetObjectStore = transaction.objectStore('budget');

  // get all records from the store and set to a variable
  const getAll = budgetObjectStore.getAll();

  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open one more transaction
          const transaction = db.transaction(['budget'], 'readwrite');
          // access the butdget transaction object store
          const budgetObjectStore = transaction.objectStore('budget');
          // clear all items in your store
          budgetObjectStore.clear();

          alert('All saved transactions have been submitted!');
          location.reload();
        })
        .catch(err => {
          console.log(err);
        });

    } else {
      // if no pending transactions in indexedDB, signal the reconnect (after checking for cached transactions)
      const event = document.createEvent('Event');
      event.initEvent('readytosync', true, true);
      window.dispatchEvent(event);
    }
  };
}

idbConnect();

window.addEventListener('online', idbSyncTransactions);