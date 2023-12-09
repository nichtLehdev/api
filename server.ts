import app from "./src/index"
import load_dotenv from "dotenv"
import rateLimit from "express-rate-limit"

load_dotenv.config()

const port = process.env.PORT || '9999'

// Rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});