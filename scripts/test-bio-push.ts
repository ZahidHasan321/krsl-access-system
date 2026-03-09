async function testPush() {
	const SN = 'DUMMY_SN_123';
	const PIN = '0001'; // Should match biometricId '1'
	const FID = '0';
	const No = '1';
	const data = `BIODATA PIN=${PIN}\tFID=${FID}\tNo=${No}\tSize=443\tContent=ABCDEFG1234567`;

	console.log(`==> Simulating BIODATA push for PIN ${PIN}...`);
	try {
		const res = await fetch(`http://localhost:8080/iclock/cdata?table=BIODATA&SN=${SN}`, {
			method: 'POST',
			body: data
		});
		const text = await res.text();
		console.log(`    Response: ${text}`);
	} catch (e: any) {
		console.error(`    Error: ${e.message}`);
	}
}

testPush();
