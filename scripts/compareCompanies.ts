/**
 * Script to compare provided company assignments with current database
 */

// Provided list from user
const providedList: Array<{firstName: string, lastName: string, company: string}> = [
  { firstName: 'Tamera', lastName: 'Wallace', company: 'ACO' },
  { firstName: 'Makaela', lastName: 'Whitley', company: 'BCO' },
  { firstName: 'Evan', lastName: 'Sagatovski', company: 'CCO' },
  { firstName: 'Katie', lastName: 'Moebes', company: 'ACO' },
  { firstName: 'Yen', lastName: 'Le', company: 'HQ' },
  { firstName: 'McKenzie', lastName: 'Dacus', company: 'CCO' },
  { firstName: 'Matteo', lastName: 'Garza', company: 'HQ' },
  { firstName: 'Gavin', lastName: 'Guerra', company: 'RCO' },
  { firstName: 'Lillian', lastName: 'Robinson', company: 'CCO' },
  { firstName: 'Kenny', lastName: 'Biegalski', company: 'RCO' },
  { firstName: 'Ryan', lastName: 'Fagan', company: 'CCO' },
  { firstName: 'Joshua', lastName: 'Kang', company: 'ACO' },
  { firstName: 'Raven', lastName: 'Kirkland', company: 'RCO' },
  { firstName: 'Emma Kate', lastName: 'Merriam', company: 'RCO' },
  { firstName: 'Richard', lastName: 'Rabindran', company: 'BCO' },
  { firstName: 'Sean', lastName: 'Lupczynski', company: '' },
  { firstName: 'Davis', lastName: 'Evans', company: 'HQ' },
  { firstName: 'Hampton', lastName: 'Jackson', company: 'RCO' },
  { firstName: 'John', lastName: 'Baria', company: 'RCO' },
  { firstName: 'Andrew', lastName: 'Brezeale', company: 'ACO' },
  { firstName: 'Kaidyn', lastName: 'Harris', company: 'BCO' },
  { firstName: 'Michael', lastName: 'Liscano', company: 'ACO' },
  { firstName: 'Isabella', lastName: 'Navarro', company: 'CCO' },
  { firstName: 'Ryan', lastName: 'Kronmiller', company: 'CCO' },
  { firstName: 'Logan', lastName: 'Magilligan', company: 'CCO' },
  { firstName: 'Peyton', lastName: 'Nobrega', company: 'BCO' },
  { firstName: 'Chase', lastName: 'Williams', company: 'ACO' },
  { firstName: 'Paul', lastName: 'Choo', company: 'CCO' },
  { firstName: 'Rex', lastName: 'Maddux', company: 'HQ' },
  { firstName: 'Jackson', lastName: 'Martin', company: 'BCO' },
  { firstName: 'Sydney', lastName: 'McFadden', company: 'RCO' },
  { firstName: 'Andrew', lastName: 'Dantoulis', company: 'CCO' },
  { firstName: 'Danny', lastName: 'Lipsey', company: 'BCO' },
  { firstName: 'Rafael', lastName: 'Reece', company: 'CCO' },
  { firstName: 'Brendan', lastName: 'Latorre-Murrin', company: 'RCO' },
  { firstName: 'Andrew', lastName: 'Shield', company: 'CCO' },
  { firstName: 'Daniel', lastName: 'Woodson', company: 'BCO' },
  { firstName: 'Ansley', lastName: 'Adkinson', company: 'RCO' },
  { firstName: 'Zennik', lastName: 'Bublak', company: 'RCO' },
  { firstName: 'Jacob', lastName: 'Dickerson', company: 'CCO' },
  { firstName: 'Alexander', lastName: 'Keifer', company: 'RCO' },
  { firstName: 'Logan', lastName: 'Reed', company: 'RCO' },
  { firstName: 'Thomas', lastName: 'Wotka', company: 'RCO' },
  { firstName: 'Kelly', lastName: 'Hickey', company: 'ACO' },
  { firstName: 'Julianna', lastName: 'Phillips', company: 'ACO' },
  { firstName: 'Dwight', lastName: 'Banks', company: 'ACO' },
  { firstName: 'Kushal', lastName: 'Dwaram', company: 'BCO' },
  { firstName: 'James', lastName: 'Nelson', company: 'ACO' },
  { firstName: 'Aydin', lastName: 'Street', company: 'BCO' },
  { firstName: 'Michael', lastName: 'Wilson', company: 'RCO' },
  { firstName: 'Leah', lastName: 'McCoy', company: 'CCO' },
  { firstName: 'Sarah', lastName: 'Burnette', company: 'ACO' },
  { firstName: 'Alex', lastName: 'Jahng', company: 'ACO' },
  { firstName: 'Ben', lastName: 'Hill', company: 'RCO' },
  { firstName: 'Ethan', lastName: 'Wilkins', company: 'ACO' },
  { firstName: 'Harshitha', lastName: 'Ganesan', company: 'CCO' },
  { firstName: 'Bella', lastName: 'Hunt', company: 'CCO' },
  { firstName: 'Imogene', lastName: 'Sutherland', company: 'BCO' },
  { firstName: 'Avery', lastName: 'Donahoe', company: 'BCO' },
  { firstName: 'Fafa', lastName: 'Kwashie', company: 'BCO' },
  { firstName: 'Sam', lastName: 'Kiefer', company: 'RCO' },
  { firstName: 'Jordan', lastName: 'Markley', company: 'ACO' },
  { firstName: 'Sofia', lastName: 'Multhauf', company: 'ACO' },
  { firstName: 'Ryan', lastName: 'Scanlon', company: 'BCO' },
];

// Current database (from importCadets.ts)
const currentDB: Array<{firstName: string, lastName: string, company: string}> = [
  { firstName: 'Harshitha', lastName: 'Ganesan', company: 'Alpha' },
  { firstName: 'Bella', lastName: 'Hunt', company: 'Alpha' },
  { firstName: 'Imogene', lastName: 'Sutherland', company: 'Alpha' },
  { firstName: 'Ansley', lastName: 'Adkinson', company: 'Alpha' },
  { firstName: 'Zennik', lastName: 'Bublak', company: 'Alpha' },
  { firstName: 'Jacob', lastName: 'Dickerson', company: 'Alpha' },
  { firstName: 'Alexander', lastName: 'Keifer', company: 'Alpha' },
  { firstName: 'Leah', lastName: 'McCoy', company: 'Alpha' },
  { firstName: 'Logan', lastName: 'Reed', company: 'Alpha' },
  { firstName: 'Thomas', lastName: 'Wotka', company: 'Alpha' },
  { firstName: 'John', lastName: 'Baria', company: 'Alpha' },
  { firstName: 'Andrew', lastName: 'Brezeale', company: 'Alpha' },
  { firstName: 'Kaidyn', lastName: 'Harris', company: 'Alpha' },
  { firstName: 'Ryan', lastName: 'Kronmiller', company: 'Alpha' },
  { firstName: 'Michael', lastName: 'Liscano', company: 'Alpha' },
  { firstName: 'Logan', lastName: 'Magilligan', company: 'Alpha' },
  { firstName: 'Isabella', lastName: 'Navarro', company: 'Alpha' },
  { firstName: 'Peyton', lastName: 'Nobrega', company: 'Alpha' },
  { firstName: 'Andrew', lastName: 'Stefan', company: 'Alpha' },
  { firstName: 'Chase', lastName: 'Williams', company: 'Alpha' },
  { firstName: 'Yen', lastName: 'Le', company: 'Alpha' },
  { firstName: 'Katie', lastName: 'Moebes', company: 'Alpha' },
  { firstName: 'Tamera', lastName: 'Wallace', company: 'Alpha' },
  { firstName: 'Avery', lastName: 'Donahoe', company: 'Bravo' },
  { firstName: 'Sam', lastName: 'Kiefer', company: 'Bravo' },
  { firstName: 'Fafa', lastName: 'Kwashie', company: 'Bravo' },
  { firstName: 'Jordan', lastName: 'Markley', company: 'Bravo' },
  { firstName: 'Sofia', lastName: 'Multhauf', company: 'Bravo' },
  { firstName: 'Ryan', lastName: 'Scanlon', company: 'Bravo' },
  { firstName: 'Sarah', lastName: 'Burnette', company: 'Bravo' },
  { firstName: 'Kelly', lastName: 'Hickey', company: 'Bravo' },
  { firstName: 'Alex', lastName: 'Jahng', company: 'Bravo' },
  { firstName: 'Alex', lastName: 'Lopez', company: 'Bravo' },
  { firstName: 'Julianna', lastName: 'Phillips', company: 'Bravo' },
  { firstName: 'Michael', lastName: 'Wilson', company: 'Bravo' },
  { firstName: 'Paul', lastName: 'Choo', company: 'Bravo' },
  { firstName: 'Rex', lastName: 'Maddux', company: 'Bravo' },
  { firstName: 'Emery', lastName: 'Marsh', company: 'Bravo' },
  { firstName: 'Jackson', lastName: 'Martin', company: 'Bravo' },
  { firstName: 'Sydney', lastName: 'McFadden', company: 'Bravo' },
  { firstName: 'McKenzie', lastName: 'Dacus', company: 'Bravo' },
  { firstName: 'Matteo', lastName: 'Garza', company: 'Bravo' },
  { firstName: 'Gavin', lastName: 'Guerra', company: 'Bravo' },
  { firstName: 'Lillian', lastName: 'Robinson', company: 'Bravo' },
  { firstName: 'Makaela', lastName: 'Whitley', company: 'Bravo' },
  { firstName: 'Dwight', lastName: 'Banks', company: 'Charlie' },
  { firstName: 'Kushal', lastName: 'Dwaram', company: 'Charlie' },
  { firstName: 'Ben', lastName: 'Hill', company: 'Charlie' },
  { firstName: 'James', lastName: 'Nelson', company: 'Charlie' },
  { firstName: 'Aydin', lastName: 'Street', company: 'Charlie' },
  { firstName: 'Lexis', lastName: 'Van Meter', company: 'Charlie' },
  { firstName: 'Ethan', lastName: 'Wilkins', company: 'Charlie' },
  { firstName: 'William', lastName: 'Brewer', company: 'Charlie' },
  { firstName: 'Andrew', lastName: 'Dantoulis', company: 'Charlie' },
  { firstName: 'Brendan', lastName: 'Latorre-Murrin', company: 'Charlie' },
  { firstName: 'Danny', lastName: 'Lipsey', company: 'Charlie' },
  { firstName: 'Rafael', lastName: 'Reece', company: 'Charlie' },
  { firstName: 'Andrew', lastName: 'Shield', company: 'Charlie' },
  { firstName: 'Daniel', lastName: 'Woodson', company: 'Charlie' },
  { firstName: 'Kenny', lastName: 'Biegalski', company: 'Charlie' },
  { firstName: 'Ryan', lastName: 'Fagan', company: 'Charlie' },
  { firstName: 'Joshua', lastName: 'Kang', company: 'Charlie' },
  { firstName: 'Raven', lastName: 'Kirkland', company: 'Charlie' },
  { firstName: 'Sean', lastName: 'Lupczynski', company: 'Charlie' },
  { firstName: 'Emma Kate', lastName: 'Merriam', company: 'Charlie' },
  { firstName: 'Richard', lastName: 'Rabindran', company: 'Charlie' },
  { firstName: 'Evan', lastName: 'Sagatovski', company: 'Charlie' },
  { firstName: 'Davis', lastName: 'Evans', company: 'Ranger' },
  { firstName: 'Hampton', lastName: 'Jackson', company: 'Ranger' },
];

// Company mapping
const companyMap: Record<string, string> = {
  'ACO': 'Alpha',
  'BCO': 'Bravo',
  'CCO': 'Charlie',
  'RCO': 'Ranger',
  'HQ': 'Headquarters Company',
};

function normalizeName(first: string, last: string): string {
  return `${first.toLowerCase().trim()}_${last.toLowerCase().trim()}`;
}

function compareLists() {
  // Create maps for easier lookup
  const providedMap = new Map<string, string>();
  const currentMap = new Map<string, string>();
  
  providedList.forEach(c => {
    if (c.company) {
      const key = normalizeName(c.firstName, c.lastName);
      providedMap.set(key, companyMap[c.company] || c.company);
    }
  });
  
  currentDB.forEach(c => {
    const key = normalizeName(c.firstName, c.lastName);
    currentMap.set(key, c.company);
  });
  
  // Find mismatches
  const mismatches: Array<{name: string, current: string, provided: string}> = [];
  const missingInDB: Array<{name: string, provided: string}> = [];
  const missingInProvided: Array<{name: string, current: string}> = [];
  
  // Check provided list against current DB
  providedMap.forEach((providedCompany, key) => {
    const currentCompany = currentMap.get(key);
    if (!currentCompany) {
      const name = key.replace('_', ' ');
      missingInDB.push({ name, provided: providedCompany });
    } else if (currentCompany !== providedCompany) {
      const name = key.replace('_', ' ');
      mismatches.push({ name, current: currentCompany, provided: providedCompany });
    }
  });
  
  // Check current DB against provided list
  currentMap.forEach((currentCompany, key) => {
    if (!providedMap.has(key)) {
      const name = key.replace('_', ' ');
      missingInProvided.push({ name, current: currentCompany });
    }
  });
  
  // Print results
  console.log('='.repeat(80));
  console.log('COMPANY ASSIGNMENT COMPARISON REPORT');
  console.log('='.repeat(80));
  console.log();
  
  if (mismatches.length > 0) {
    console.log(`\n❌ COMPANY ASSIGNMENT MISMATCHES (${mismatches.length}):`);
    console.log('-'.repeat(80));
    mismatches.forEach(m => {
      console.log(`${m.name.padEnd(30)} Current: ${m.current.padEnd(20)} → Should be: ${m.provided}`);
    });
  }
  
  if (missingInDB.length > 0) {
    console.log(`\n⚠️  MISSING IN DATABASE (${missingInDB.length}):`);
    console.log('-'.repeat(80));
    missingInDB.forEach(m => {
      console.log(`${m.name.padEnd(30)} Should be in: ${m.provided}`);
    });
  }
  
  if (missingInProvided.length > 0) {
    console.log(`\nℹ️  IN DATABASE BUT NOT IN PROVIDED LIST (${missingInProvided.length}):`);
    console.log('-'.repeat(80));
    missingInProvided.forEach(m => {
      console.log(`${m.name.padEnd(30)} Currently in: ${m.current}`);
    });
  }
  
  if (mismatches.length === 0 && missingInDB.length === 0 && missingInProvided.length === 0) {
    console.log('\n✅ All assignments match!');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\nSUMMARY:');
  console.log(`  Total in provided list: ${providedList.length}`);
  console.log(`  Total in current DB: ${currentDB.length}`);
  console.log(`  Mismatches: ${mismatches.length}`);
  console.log(`  Missing in DB: ${missingInDB.length}`);
  console.log(`  Missing in provided list: ${missingInProvided.length}`);
}

compareLists();
