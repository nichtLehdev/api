import app from "./src/index"
import load_dotenv from "dotenv"

load_dotenv.config()

const port = process.env.PORT || '3000'

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}/`)
    }
)