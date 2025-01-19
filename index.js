require('dotenv').config()
const TelegramApi = require('node-telegram-bot-api')
const { token } = process.env
// Настроим тайм-аут на 30 секунд (30000 миллисекунд)
const bot = new TelegramApi(token, {
	polling: true,
	request: {
		timeout: 30000, // Установка тайм-аута
	},
})
const retryRequest = async (fn, retries = 5, delay = 1000) => {
	let attempt = 0
	while (attempt < retries) {
		try {
			return await fn()
		} catch (error) {
			attempt++
			if (attempt >= retries) throw error
			await new Promise(resolve => setTimeout(resolve, delay))
		}
	}
}
const { recipientChatIds } = process.env
const userStates = {} // Для хранения состояния пользователей
const uniqueUsers = new Set() // Множество для хранения уникальных пользователей

bot.setMyCommands([
	{ command: '/start', description: 'Запуск бота' },
	{ command: '/info', description: 'Информация' },
	{ command: '/question', description: 'Задать вопрос' },
	{ command: '/buy', description: 'Купить телефон' },
])

// Функция для отправки клавиатуры с сообщением
async function sendKeyboard(chatId, message, keyboard) {
	await bot.sendMessage(chatId, message, {
		reply_markup: { keyboard, resize_keyboard: true },
	})
}

// Функция для инициализации команд и шагов
async function initSteps(chatId) {
	const commandList = [
		{ command: '/buy', description: 'Купить телефон' },
		{ command: '/info', description: 'Информация' },
		{ command: '/question', description: 'Задать вопрос' },
	]

	const commandString = commandList
		.map(cmd => `💥 <b>${cmd.command}</b>: <b>${cmd.description}</b>`)
		.join('\n\n')

	await bot.sendSticker(
		chatId,
		'https://cdn2.combot.org/privet702/webp/10xf09f929f.webp'
	)
	await bot.sendMessage(
		chatId,
		`<b>Приветствую тебя в телеграм боте для покупки телефонов!</b>\n\n${commandString}`,
		{ parse_mode: 'HTML' }
	)
}

// Обработка шагов
const steps = {
	'/start': async chatId => await initSteps(chatId),
	'/info': async chatId => {
		await bot.sendMessage(
			chatId,
			`<b>Добро пожаловать в наш бот!</b>\n\n` +
				`Мы специализируемся на продаже мобильных телефонов и предлагаем вам много удобств для легкого и быстрого шопинга. 😄\n\n` +
				`<b>Что мы предлагаем:</b>\n` +
				`• Широкий выбор мобильных телефонов: от популярных моделей до новинок 📱\n` +
				`• Поддержка в выборе подходящей модели для ваших нужд 🧐\n` +
				`• Возможность выбрать нужный объем памяти, цвет и версию 📦\n` +
				`• Пожизненная техническая поддержка и консультации 🛠️\n` +
				`• Удобный процесс возврата и обмена товаров 💯\n` +
				`• Простая и быстрая доставка прямо к вам домой 🚚\n` +
				`• Постоянные акции, скидки и бонусы для наших пользователей 🎉\n\n` +
				`<b>Почему стоит выбрать нас?</b>\n` +
				`• Мы предлагаем только качественные и проверенные товары.\n` +
				`• Поддержка клиентов на всех этапах покупки и доставки.\n` +
				`• Удобный и быстрый процесс заказа.\n` +
				`• Регулярные новинки и эксклюзивные предложения.\n\n` +
				`<i>Не стесняйтесь задавать вопросы, мы всегда готовы помочь!</i>`,
			{ parse_mode: 'HTML' }
		)
	},
	'/question': async chatId => {
		// Убедимся, что для данного chatId существует объект userStates
		if (!userStates[chatId]) {
			userStates[chatId] = {} // Если его нет, создаем новый объект
		}

		// Устанавливаем шаг, чтобы бот знал, что мы ожидаем вопрос
		userStates[chatId].step = 'waitingForQuestion'

		// Отправляем первое сообщение с инструкцией
		await bot.sendMessage(
			chatId,
			`❓ <b>У вас есть вопрос? Мы всегда готовы помочь!</b>\n\n` +
				`Напишите свой вопрос, и наш специалист постарается дать на него подробный и быстрый ответ. 💬\n\n` +
				`Мы ценим каждого клиента и хотим, чтобы ваш опыт с нами был максимально приятным. 🏆`,
			{ parse_mode: 'HTML' }
		)

		// Отправляем второе сообщение с просьбой задать вопрос
		await bot.sendMessage(
			chatId,
			`Пожалуйста, напишите ваш вопрос ниже, и мы постараемся ответить на него как можно скорее!`
		)
	},

	'/buy': async chatId => {
		userStates[chatId] = { step: 'chooseModel' } // Установка шага
		await sendKeyboard(chatId, 'Выбирай модель телефона:', [
			['⭐️ iphone 11', '⭐️ iphone 12'],
			['⭐️ iphone 13', '⭐️ iphone 14'],
			['⭐️ iphone 15', '⭐️ iphone 16'],
			['❌ Закрыть меню'],
		])
	},
}

// Обработка входящих сообщений
bot.on('message', async msg => {
	const { text, chat } = msg
	const chatId = chat.id

	uniqueUsers.add(chatId) // Добавляем уникального пользователя
	console.log(
		`\n=========================================\n` +
			`🔢 Количество уникальных пользователей: ${uniqueUsers.size}\n` +
			`=========================================\n`
	) // Логируем количество уникальных пользователей

	// Если команда /start или другая команда из списка
	if (steps[text]) {
		return steps[text](chatId)
	}

	const step = userStates[chatId]?.step
	if (step) {
		await handleUserChoice(chatId, text, step)
	}
})

async function handleUserChoice(chatId, text, step) {
	const modelsMap = {
		'⭐️ iphone 11': 'iphone 11',
		'⭐️ iphone 12': 'iphone 12',
		'⭐️ iphone 13': 'iphone 13',
		'⭐️ iphone 14': 'iphone 14',
		'⭐️ iphone 15': 'iphone 15',
		'⭐️ iphone 16': 'iphone 16',
	}

	if (step === 'chooseModel') {
		if (modelsMap[text]) {
			userStates[chatId].model = modelsMap[text]
			userStates[chatId].step = 'chooseVersion'
			await sendKeyboard(
				chatId,
				`Вы выбрали модель: ${text}. Теперь выберите версию:`,
				[
					[`${text} Pro`, `${text} Pro Max`, `${text} Mini`, `${text}`],
					['🔙 Назад'],
				]
			)
		} else if (text === '❌ Закрыть меню') {
			await bot.sendMessage(chatId, 'Меню закрыто.')
		} else {
			await bot.sendMessage(
				chatId,
				'Пожалуйста, выберите модель из предложенного списка.'
			)
		}
	}

	if (step === 'chooseVersion') {
		if (text === '🔙 Назад') {
			userStates[chatId].step = 'chooseModel' // Возвращаем к шагу выбора модели
			await sendKeyboard(chatId, 'Выбирайте модель телефона:', [
				['⭐️ iphone 11', '⭐️ iphone 12'],
				['⭐️ iphone 13', '⭐️ iphone 14'],
				['⭐️ iphone 15', '⭐️ iphone 16'],
				['❌ Закрыть меню'],
			])
		} else {
			// Преобразование названия версии для поиска в priceList
			const versionKey = text.replace(/^⭐️ /, '').trim()
			userStates[chatId].version = versionKey
			userStates[chatId].step = 'chooseCapacity'
			await sendKeyboard(
				chatId,
				`Вы выбрали версию: ${versionKey}. Теперь выберите объем памяти:`,
				[['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'], ['Назад']]
			)
		}
	}

	if (step === 'chooseCapacity') {
		if (text === '🔙 Назад') {
			userStates[chatId].step = 'chooseVersion' // Возвращаем к шагу выбора версии
			await sendKeyboard(chatId, `Выберите версию:`, [
				[
					`${userStates[chatId].model} Pro`,
					`${userStates[chatId].model} Pro Max`,
					`${userStates[chatId].model} Mini`,
					`${userStates[chatId].model}`,
				],
				['🔙 Назад'],
			])
		} else {
			userStates[chatId].capacity = text
			userStates[chatId].step = 'chooseColor'

			// Убираем клавиатуру и просим ввести цвет вручную
			await bot.sendMessage(
				chatId,
				`Вы выбрали объем памяти: ${text}. Теперь введите цвет вашего устройства, или напишите "Укажу позже", если хотите указать цвет позже.`,
				{ reply_markup: { remove_keyboard: true } } // Убираем клавиатуру
			)
		}
	}

	// Обработка нажатия кнопки "❌ Закрыть меню"
	if (text === '❌ Закрыть меню') {
		// Очищаем состояние пользователя
		delete userStates[chatId]
		await bot.sendMessage(
			chatId,
			'Меню закрыто. Если хотите начать снова, напишите "Меню".',
			{
				reply_markup: {
					remove_keyboard: true, // Убираем клавиатуру
				},
			}
		)
		return // Завершаем процесс
	}

	// Обработка выбора цвета
	if (step === 'chooseColor') {
		if (text === '🔙 Назад') {
			userStates[chatId].step = 'chooseCapacity' // Возвращаем к шагу выбора объема памяти
			await sendKeyboard(chatId, `Выберите объем памяти:`, [
				['64 GB', '128 GB', '256 GB', '512 GB'],
				['🔙 Назад'],
			])
		} else {
			// Просим пользователя ввести цвет текста
			userStates[chatId].color = text
			const { model, version, capacity } = userStates[chatId]

			// Отправляем итоговое сообщение с подтверждением заказа
			const resultMessage = `
            Ваш заказ:
            Версия: ${version}
            Объем памяти: ${capacity}
            Цвет: ${text}
        `

			// Спрашиваем подтверждение заказа
			await bot.sendMessage(chatId, `${resultMessage}\n\nВсе верно?`, {
				reply_markup: {
					inline_keyboard: [
						[{ text: 'Да, все верно', callback_data: 'confirm_order' }],
						[{ text: 'Нет, исправить', callback_data: 'edit_order' }],
					],
				},
			})
		}
	}
}

// Обработка callback данных (кнопки)
bot.on('callback_query', async query => {
	const chatId = query.message.chat.id
	const action = query.data

	if (action === 'confirm_order') {
		userStates[chatId].step = 'waitingForAddress'
		await bot.sendMessage(
			chatId,
			'Пожалуйста, отправьте ваш адрес для доставки.',
			{ reply_markup: { remove_keyboard: true } }
		)
	} else if (action === 'edit_order') {
		userStates[chatId].step = 'chooseModel'
		await sendKeyboard(chatId, 'Выберите модель:', [
			['⭐️ iphone 11', '⭐️ iphone 12'],
			['⭐️ iphone 13', '⭐️ iphone 14'],
			['⭐️ iphone 15', '⭐️ iphone 16'],
		])
	}
})

/// Шаг получения адреса
bot.on('message', async msg => {
	const { text, chat } = msg
	const chatId = chat.id

	// Проверка на адрес
	if (userStates[chatId]?.step === 'waitingForAddress') {
		userStates[chatId].address = text // Сохраняем адрес
		userStates[chatId].step = 'waitingForWish' // Переход к пожеланиям

		await bot.sendMessage(
			chatId,
			'Спасибо за адрес! Теперь, если у вас есть пожелания по заказу (например, дополнительные аксессуары или особенности доставки), напишите их ниже.'
		)
		return
	}

	// Проверка на пожелания
	if (userStates[chatId]?.step === 'waitingForWish') {
		userStates[chatId].wish = text // Сохраняем пожелания
		userStates[chatId].step = 'waitingForContact' // Переход к запросу контакта

		await bot.sendMessage(
			chatId,
			`Спасибо за пожелания: "${text}". Пожалуйста, отправьте ваш контактный номер, чтобы мы могли завершить оформление заказа.`,
			{
				reply_markup: {
					keyboard: [
						[{ text: 'Отправить мой контакт', request_contact: true }],
						['🔙 Назад'],
					],
					one_time_keyboard: true,
					remove_keyboard: true, // Убираем клавиатуру после ввода пожеланий
				},
			}
		)
		return
	}
})

bot.on('contact', async msg => {
	const chatId = msg.chat.id
	const contact = msg.contact

	if (contact) {
		const phoneNumber = contact.phone_number
		const userName = msg.from.username || 'Не указано' // Получаем ник пользователя

		if (!userStates[chatId]) {
			userStates[chatId] = {}
		}
		userStates[chatId].contact = phoneNumber // Сохраняем номер телефона
		// Сохраняем номер телефона
		userStates[chatId].contactUsername = userName // Сохраняем ник пользователя

		// Формируем итоговое сообщение с данными заказа
		const {
			version,
			capacity,
			color,
			address,
			wish,
			contact: userContact,
			contactUsername,
		} = userStates[chatId]
		const resultMessage = `
      Ваш заказ:
      Версия: ${version}
      Объем памяти: ${capacity}
      Цвет: ${color}
      Адрес доставки: ${address}
      Пожелания: ${wish}
      Контактный номер: ${userContact}
      Ник в Telegram: @${contactUsername}
    `

		// Отправляем итоговое сообщение с заказом пользователю
		await bot.sendMessage(chatId, `📱 ${resultMessage}`, { parse_mode: 'HTML' })

		// Отправляем сообщение всем указанным получателям
		for (const id of recipientChatIds) {
			const messageWithTitle = `🧰\nНовый заказ\n🧰\n\n${resultMessage}`
			await bot.sendMessage(id, messageWithTitle, { parse_mode: 'HTML' })
		}

		// Завершаем процесс заказа
		await bot.sendMessage(
			chatId,
			'Ваш заказ успешно оформлен! Мы свяжемся с вами для уточнения деталей.'
		)
		delete userStates[chatId] // Очищаем состояние пользователя
	}
})
bot.on('message', async msg => {
	const { text, chat } = msg
	const chatId = chat.id

	// Проверка на существование объекта userStates[chatId]
	if (!userStates[chatId]) {
		userStates[chatId] = {} // Если нет, создаем его
	}

	const step = userStates[chatId]?.step
	if (step === 'waitingForQuestion') {
		// Если это не команда, а обычное сообщение
		if (text && !text.startsWith('/')) {
			// Получаем ник пользователя
			const userName = msg.from.username || 'Не указано' // Если нет ника, ставим "Не указано"

			// Формируем текст с вопросом
			const questionMessage = `❓ Новый вопрос от пользователя @${userName} (${chatId}):\n\n${text}`

			// Пересылаем вопрос всем администраторам
			for (const id of recipientChatIds) {
				await bot.sendMessage(id, questionMessage)
			}

			// Отправляем подтверждение пользователю
			await bot.sendMessage(
				chatId,
				'Ваш вопрос успешно отправлен нашим специалистам! Мы скоро ответим на него. 🏆'
			)

			// Завершаем шаг
			userStates[chatId].step = null // Очищаем состояние пользователя
		}
	}
})
