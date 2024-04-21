document.addEventListener('DOMContentLoaded', function () {
	// Update the time every second
	setInterval(() => {
		const now = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });
		const date = new Date(now);
		const hour = `${date.getHours()}`.padStart(2, 0);
		const min = `${date.getMinutes()}`.padStart(2, 0);
		const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		// Update the current day and time
		document.getElementById('currentDay').textContent = days[date.getDay()] + ', ' + `${hour}:${min}:${date.getSeconds()}`;
	});

	// Enable tooltips
	const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
	const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

	// Handle checkbox logic
	const predefinedNumbers = {
		'JAIZ BANK': ['2348033531332', '2349099685313', '2348122353161'],
		// 'JAIZ BANK': ['2348033531332', '2348122353161'],
	};

	function addCheckboxListener(id, key) {
		document.getElementById(id).addEventListener('click', function () {
			if (this.checked) {
				// Update the message
				document.getElementById('message').value = predefinedNumbers[key].join(',');
			} else {
				// Clear the message
				document.getElementById('message').value = '';
			}
		});
	}

	// Add listener to checkbox
	addCheckboxListener('jaizbank', 'JAIZ BANK');
});