const { v4: uuidv4 } = require('uuid');
const schedule = require('node-schedule');
const { scheduleJobs } = require('../utils/scheduleJob');
const ScheduledSms = require('../models/scheduledSms');

// Flash a message and redirect to the home page
const flashAndRedirect = (req, res, status, message) => {
	req.flash('error', message);
	return res.status(status).redirect('/');
};

// Split and remove whitespace from a string
const splitAndTrim = (str) => {
	return str.split(',').map(item => item.trim());
};

// Render the schedule page
const renderSchedule = async (_req, res) => {
	const scheduledSms = await ScheduledSms.find();
	res.render('index', { scheduledSms });
};

// Schedule a task
const scheduleTask = async (req, res) => {
	try {
		let { day, interval, startTime, endTime, title, message } = req.body;

		if (day === undefined || !startTime || !endTime || !message || title === undefined) {
			return flashAndRedirect(req, res, 400, 'Please fill in all fields');
		}

		day = Array.isArray(day) ? day : [day]; // Ensure day is an array
		title = Array.isArray(title) ? title : [title]; // Ensure title is an array

		if (day.length === 0 || title.length === 0) {
			return flashAndRedirect(req, res, 400, 'Please fill in all fields');
		} else if (interval === undefined || interval === '') {
			return flashAndRedirect(req, res, 400, 'Interval cannot be blank');
		} else if (startTime >= endTime) {
			return flashAndRedirect(req, res, 400, 'Start time must be before end time');
		} else {
			const phoneNumbers = splitAndTrim(message); // Split the phone numbers and remove whitespace

			// Check if the phone numbers are valid
			for (const phoneNumber of phoneNumbers) {
				if (!/^234\d{10}$/.test(phoneNumber)) {
					return flashAndRedirect(req, res, 400, 'Enter valid Nigerian numbers, separated by commas. Numbers should start with 234 and be 13 digits long.');
				}
			}

			const checkDuplicateNum = new Set(phoneNumbers); // Check for duplicate phone numbers
			if (checkDuplicateNum.size !== phoneNumbers.length) {
				return flashAndRedirect(req, res, 400, 'Duplicate phone numbers are not allowed');
			}

			const [startHour, startMinute] = startTime.split(':').map(item => Number(item)); // Split the start and end times
			const [endHour, endMinute] = endTime.split(':').map(item => Number(item)); // Split the start and end times

			const startMinutes = startHour * 60 + startMinute;  // Convert the start and end times to minutes
			const endMinutes = endHour * 60 + endMinute;  // Convert the start and end times to minutes
			const duration = endMinutes - startMinutes;  // Calculate the duration of the task

			// Check if the interval is greater than the duration of the task
			if (interval > duration) {
				req.flash('error', 'Interval cannot be greater than the duration');
			} else {
				const receivers = splitAndTrim(message); // Split the phone numbers and remove whitespace

				const jobName = uuidv4(); // Generate a unique job name

				// Check if a task with the same time already exists
				const existingTask = await ScheduledSms.findOne({ day, startTime, endTime });
				if (existingTask) {
					req.flash('deleteError', 'A task is already scheduled for this time');
					return res.status(400).redirect('/');
				}

				scheduleJobs(jobName, day, startHour, startMinute, receivers, title); // Schedule the first task

				// Schedule the remaining tasks if there is an interval
				if (interval) {
					const intervalMinutes = Number(interval);
					let nextMinutes = startMinutes + intervalMinutes; // Calculate the next task time

					while (nextMinutes < endMinutes) {
						const nextHour = Math.floor(nextMinutes / 60);
						const nextMinute = nextMinutes % 60;

						scheduleJobs(jobName, day, nextHour, nextMinute, receivers, title);

						nextMinutes += intervalMinutes; // Calculate the next task time
					}
				}

				// Schedule the last task if the interval does not divide the duration evenly
				scheduleJobs(jobName, day, endHour, endMinute, receivers, title);

				const scheduledSms = new ScheduledSms({
					day: day.map(item => item.trim()), // Save the current day
					interval,
					startTime,
					endTime,
					senderId: title.map(item => item.trim()), // Save the current title
					receivers: receivers, // Save the receivers
					jobName,
					status: 'Active'
				});

				await scheduledSms.save();

				req.flash('success', 'Tasks Scheduled!');
			}
		}

		return res.status(200).redirect('/');
	} catch (err) {
		console.error('Error Scheduling Tasks:', err.message);
		req.flash('error', 'There was an error scheduling your tasks. Please try again later.');
		return res.status(500).redirect('/');
	}
};

// Delete a task
const deleteTask = async (req, res, _next) => {
	try {
		const { id } = req.params;
		const scheduledSms = await ScheduledSms.findById(id);
		if (!scheduledSms) {
			req.flash('deleteError', 'Scheduled SMS not found');
			return res.status(404).redirect('/');
		}

		// Cancel the scheduled job
		const job = schedule.scheduledJobs[scheduledSms.jobName];
		if (job) {
			job.cancel();
		}

		// Delete the ScheduledSms document
		const deletedSms = await ScheduledSms.findByIdAndDelete(id);
		if (!deletedSms) {
			throw new Error('Failed to delete ScheduledSms document');
		}

		req.flash('deleteSuccess', 'Successfully deleted a task!');
		return res.status(200).redirect('/');
	} catch (err) {
		console.error('Error Deleting Task:', err.message);
		req.flash('deleteError', 'There was an error deleting your tasks. Please try again later.');
		return res.status(500).redirect('/');
	}
};

module.exports = { renderSchedule, scheduleTask, deleteTask };