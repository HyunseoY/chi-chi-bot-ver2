// 1. 주요 클래스 가져오기
const { Client, Events, GatewayIntentBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { token } = require('./config.json');

// 2. 클라이언트 객체 생성 (Guilds관련, 메시지관련 인텐트 추가)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// 3. 봇이 준비됐을때 한번만(once) 표시할 메시지
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// 4. '일정생성' 채널에 버튼 추가
client.on(Events.MessageCreate, async (message) => {
    if (message.channel.name === '📅︱일정생성' && !message.author.bot) {
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('raid_button')
                    .setLabel('레이드')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('event_button')
                    .setLabel('이벤트')
                    .setStyle(ButtonStyle.Success),
            );

        await message.channel.send({
            embeds: [{
                title: '**일정 생성 방법**',
                description: `1️⃣  생성하려는 일정 타입을 선택합니다.\n\n` + // 줄바꿈 추가
                    `2️⃣  제공된 양식에 맞춰 파티 정보를 작성하신 뒤, 전송 버튼을 눌러주세요.\n\n` + // 줄바꿈 추가
                    `3️⃣  전송한 글은 <#1331474901189525564>에 포스트가 생성됩니다.\n\n` + // 줄바꿈 추가
                    `4️⃣  포스트에서 참여 및 인원을 관리할 수 있습니다.\n\n`,
                color: 0x0099ff,
            }],
            components: [buttonRow],
        });
    }
});

// 5. 버튼 클릭 이벤트 처리
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    // 레이드 버튼과 이벤트 버튼의 customId를 확인
    if (interaction.customId !== 'raid_button' && interaction.customId !== 'event_button') {
        return; // 해당 버튼이 아닐 경우 모달을 표시하지 않음
    }

    // 모달 생성
    const modal = new ModalBuilder()
        .setCustomId('schedule_modal')
        .setTitle('일정 생성');

    // 텍스트 입력 필드 추가
    const titleInput = new TextInputBuilder()
        .setCustomId('title_input')
        .setLabel('일정제목')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('생성하려는 일정의 제목을 입력해주세요')
        .setMaxLength(50);

    const scheduleInput = new TextInputBuilder()
        .setCustomId('schedule_input')
        .setLabel('일시')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('작성양식: 0월 0일 0요일 오전/오후 00시')
        .setMaxLength(50);

    const jobInput = new TextInputBuilder()
        .setCustomId('job_input')
        .setLabel('구인직업 및 인원')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('예: 탱 2, 힐 4, 딜 14')
        .setMaxLength(50);

    const requirementInput = new TextInputBuilder()
        .setCustomId('requirement_input')
        .setLabel('요구조건')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('예: 600+ 아이템 레벨')
        .setMaxLength(50);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('description_input')
        .setLabel('설명')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('추가적인 설명을 입력하세요')
        .setMaxLength(500);

    // 입력 필드를 모달에 추가
    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(scheduleInput),
        new ActionRowBuilder().addComponents(jobInput),
        new ActionRowBuilder().addComponents(requirementInput),
        new ActionRowBuilder().addComponents(descriptionInput),
    );

    // 모달 표시
    await interaction.showModal(modal);
});

// 6. 모달 제출 이벤트 처리
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit() && !interaction.isButton()) return;

    // 모달 제출 처리
    if (interaction.isModalSubmit() && interaction.customId === 'schedule_modal') {
        try {

            // interaction.fields가 정의되어 있는지 확인
            if (!interaction.fields) {
                throw new Error('Interaction fields are undefined');
            }

            const title = interaction.fields.getTextInputValue('title_input');
            const schedule = interaction.fields.getTextInputValue('schedule_input');
            const job = interaction.fields.getTextInputValue('job_input');
            const requirement = interaction.fields.getTextInputValue('requirement_input');
            const description = interaction.fields.getTextInputValue('description_input');

            const channel = interaction.guild.channels.cache.find(ch => ch.name === '🎪︱오락실︱일정' && ch.type === ChannelType.GuildForum);

            if (!channel) {
                return interaction.reply({ content: '채널을 찾을 수 없습니다.', flags: 64 });
            }

            // 포럼에 새 포스트 생성 및 메시지 전송
            const thread = await channel.threads.create({
                name: `${schedule}︱${title}`,
                autoArchiveDuration: 60,
                reason: '일정 생성',
                appliedTags: ['1333363041370116136'], // 모집중 태그 ID 추가
                message: {
                    embeds: [
                        {
                            title: title,
                            description: `파티 참여를 원하신다면 참여할 포지션의 버튼을 눌러주세요!`,
                            fields: [
                                {
                                    name: `⏰일시`,
                                    value: schedule,
                                },
                                {
                                    name: `🙋‍♂️구인직업 및 인원`,
                                    value: job,
                                },
                                {
                                    name: `✅요구조건`,
                                    value: requirement,
                                },
                                {
                                    name: `📝설명`,
                                    value: description,
                                }
                            ],
                            color: 0x0099ff,
                        },
                        {
                            title: '참여인원(0)',
                            fields: [
                                {
                                    name: `**탱커(0)**`,
                                    value: '',
                                },
                                {
                                    name: `**힐러(0)**`,
                                    value: '',
                                },
                                {
                                    name: `**근딜(0)**`,
                                    value: '',
                                },
                                {
                                    name: `**원딜(0)**`,
                                    value: '',
                                }
                            ],
                            color: 0x0099ff,
                        }
                    ],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('tank_button')
                                    .setLabel('탱커')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId('healer_button')
                                    .setLabel('힐러')
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId('melee_button')
                                    .setLabel('근딜')
                                    .setStyle(ButtonStyle.Danger),
                                new ButtonBuilder()
                                    .setCustomId('ranged_button')
                                    .setLabel('원딜')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId('cancel_button')
                                    .setLabel('참여취소')
                                    .setStyle(ButtonStyle.Secondary),
                            )
                    ],
                }
            });

            await interaction.reply({ content: '일정이 생성되었습니다!', flags: 64 });
        } catch (error) {
            console.error('Error creating thread or sending message:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: '메시지 전송 중 오류가 발생했습니다. 다시 시도해 주세요', flags: 64 });
            }
        }
    }
});

// 9. 시크릿키(토큰)을 통해 봇 로그인 실행
client.login(token);
