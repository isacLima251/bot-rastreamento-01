const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '_' + file.originalname.replace(/\s+/g, '_');
        cb(null, unique);
    }
});

const upload = multer({ storage });
exports.upload = upload;

function convertToMp3(inputPath) {
    const outputPath = inputPath.replace(/\.[^/.]+$/, '.mp3');
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('mp3')
            .on('error', reject)
            .on('end', () => resolve(outputPath))
            .save(outputPath);
    });
}

exports.uploadFile = async (req, res) => {
    const file = req.file;
    const tipo = req.body.tipo || 'documento';

    if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    try {
        let filePath = file.path;
        let mediaUrl = `/uploads/${file.filename}`;

        if (tipo === 'audio' && path.extname(filePath).toLowerCase() !== '.mp3') {
            filePath = await convertToMp3(filePath);
            mediaUrl = `/uploads/${path.basename(filePath)}`;
        }

        res.status(200).json({ url: mediaUrl });
    } catch (err) {
        console.error('Erro ao processar upload:', err);
        res.status(500).json({ error: 'Falha ao processar upload.' });
    }
};
