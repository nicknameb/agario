document.addEventListener('DOMContentLoaded', function() {
    document.windowid = Math.round(Math.random() * 1000000000000);
    let playerName;
    const startButton = document.getElementById('startButton');
    const playerNameInput = document.getElementById('playerName');
    const startScreen = document.getElementById('startScreen');
    const gameCanvas = document.getElementById('gameCanvas');

     startButton.addEventListener('click', function() {
        playerName = playerNameInput.value;
        if (playerName) {
            startScreen.style.display = 'none';
            gameCanvas.style.display = 'block';
            initializeGame();
        } else {
            alert('Please enter your name.');
        }
    });

    function initializeGame() {
        const getRandomNumber = (min, max) => {
            return Math.random() * (max - min) + min
        }

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const canvas = document.getElementById('gameCanvas');
        canvas.width = screenWidth;
        canvas.height = screenHeight;
        const mapWidth = 5000;
        const mapHeight = 5000;
        const lower_x = 1015;
        const lower_y = 1015;
        const higher_x = 3985;
        const higher_y = 3985;
        const ctx = canvas.getContext('2d');

        let x = getRandomNumber(lower_x, higher_x);
        let y = getRandomNumber(lower_y, higher_y);
        let isalive = true;
        let ballRadius = 15;
        let score = 0;
        const size_inc = 4;

        const socket = io();
        console.log(playerName);
        socket.emit('initialize_player', { x2: x, y2: y, windowid:document.windowid, size: ballRadius, alive: isalive, player_score: score, name: playerName });

        let mouseX = x;
        let mouseY = y;
        let dx = 0;
        let dy = 0;
        const velocity = 2;
        let offsetX;
        let offsetY;
        let players_arr;
        let lastKeyPressTime = Date.now();

        const orbsx_array = [];
        const orbsy_array = [];
        const num_orbs = 500;
        const backgroundImage = new Image();
        backgroundImage.src = 'http://localhost:5000/static/gamebackround6.jpg';
        backgroundImage.onload = function() {
            draw();
        };


        setInterval(function() {
            const currentTime = Date.now();
            const elapsedTime = currentTime - lastKeyPressTime;

            if (elapsedTime > 500) {
                dx = 0;
                dy = 0;

            }
        }, 100);

        function drawBall(x1=x,y1=y, color = '#0095DD', radius = ballRadius) {
            ctx.beginPath();
            ctx.arc(x1, y1, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.closePath();
        }

        function drawOrbs() {
             for (let i = 0; i<orbsx_array.length; i++) {
                drawBall(orbsx_array[i], orbsy_array[i], 'green', 5)
             }
        }

        function drawPlayers(players) {
            let color1;
            for (const player in players) {
                color1 = 'red';
                if (players[player].windowid === document.windowid) {
                    isalive = players[player].alive;
                    color1 = '#0095DD'
                }
                if (players[player].alive) {
                    drawBall(players[player].x2, players[player].y2, color1, players[player].size);
                }
            }
        }

        function generate_orbs()
        {
            for (let i =orbsx_array.length; i<num_orbs;i++)
            {
                let random_x = getRandomNumber(lower_x, higher_x);
                let random_y = getRandomNumber(lower_y, higher_y);
                orbsx_array.push(random_x);
                orbsy_array.push(random_y);
            }
        }

        function check_collisions()
        {
            for (let i = 0; i<orbsx_array.length; i++)  {
                if (Math.sqrt((x-orbsx_array[i])*(x-orbsx_array[i])+(y-orbsy_array[i])*(y-orbsy_array[i])) < ballRadius) {
                    orbsx_array.splice(i,1);
                    orbsy_array.splice(i,1);
                    score = score + size_inc;
                }
            }
        }

        function drawScore() {
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.fillText(`Score: ${score}`, 10, 20);
        }

        function drawLeaderboard() {
            const playersList = Object.values(players_arr);
            playersList.sort((a, b) => b.player_score - a.player_score);

            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.fillText('Leaderboard:', screenWidth - 200, 20);

            for (let i = 0; i < Math.min(playersList.length, 5); i++) {
                ctx.fillText(`${i + 1}. ${playersList[i].name}: ${playersList[i].player_score.toFixed(1)}`, screenWidth - 200, 40 + i * 20);
            }
        }

        function draw() {
            for (const player in players_arr) {
                if (players_arr[player].windowid === document.windowid) {
                    isalive = players_arr[player].alive;

                    if (players_arr[player].player_score > (score + 5))
                        score = players_arr[player].player_score;
                }
            }

            if (isalive) {
                socket.emit('movement', { x2: x, y2: y, windowid:document.windowid, size: ballRadius, alive: isalive, player_score: score });

                ballRadius = 15 + ((score - (score%10)) / 10)

                const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
                if (dist > 1) {
                    dx =((mouseX - x) / dist) * velocity;
                    dy = ((mouseY - y) / dist) * velocity;
                }

                if (((x + dx) < higher_x) && ((x + dx) > lower_x)) {
                    x += dx;
                }
                if (((y + dy) < higher_y) && ((y + dy) > lower_y)) {
                    y += dy;
                }

                offsetX = (screenWidth / 2) - x;
                offsetY = (screenHeight / 2) - y;
                ctx.save();
                ctx.translate(offsetX, offsetY);

                ctx.drawImage(backgroundImage, 0, 0, mapWidth, mapHeight);
                check_collisions();
                generate_orbs();
                drawOrbs();
                drawPlayers(players_arr);
                ctx.restore();
                drawScore();
                drawLeaderboard();
            }
            else {
                showEndScreen();
            }
        }

        function showEndScreen() {
            finalScore.textContent = score;
            gameCanvas.style.display = 'none';
            endScreen.style.display = 'block';
        }

        setInterval(draw, 10);

        gameCanvas.addEventListener('mousemove', function(event) {
            const rect = gameCanvas.getBoundingClientRect();
            mouseX = event.clientX - rect.left - offsetX;
            mouseY = event.clientY - rect.top - offsetY;
        });

        socket.on('initialize', function(players) {
            players_arr = players;
        });


        socket.on('movement', function(players) {
            players_arr = players;
            for (const player in players_arr) {
                if (players_arr[player].windowid === document.windowid) {
                    isalive = players_arr[player].alive;
                    if (players_arr[player].player_score > (score + 5))
                        score = players_arr[player].player_score;
                }
            }
        });

        socket.on('disconnect', function () {
            socket.emit('disconnect');
        });
    }
});
