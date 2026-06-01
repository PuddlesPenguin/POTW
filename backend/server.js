const express = require('express')
const app = express()
const bcrypt=require('bcrypt')
const port = 3000
const users = []

app.use(express.json())
app.get('/users', (req, res) => {
  res.json(users)
})



app.post('/users', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt()
        const hashedPassword = await bcrypt.hash(req.body.password, salt)
        const user = {name: req.body.name, password: hashedPassword}
        users.push(user)
        res.status(201).send(user)
    } catch (err) {
        res.status(500).send()
    }
})
app.listen(port)


app.post('/users/login', async (req, res) => {
    const user = users.find(user => user.name === req.body.name)
    if (!user) {
        return res.status(404).send()
    }
    try {
        const isMatch = await bcrypt.compare(req.body.password, user.password)
        if (!isMatch) {
            return res.status(401).send()
        }
        res.send(user)
    } catch (err) {
        res.status(500).send()
    }
})