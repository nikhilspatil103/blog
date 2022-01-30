
const jwt = require('jsonwebtoken')



const loginCheck = async function (req, res, next) {
    try {

        let token = req.headers['x-api-key']  //Extract Token from headers
        if (!token) {
            return res.status(403).send({ status: false, message: `Missing authentication token in request` })
        }

        let decoded = await jwt.verify(token, "projectBlog")   //verify token

        if (!decoded) {
            return res.status(403).send({ status: false, message: `Invalid authentication token in request` })
        }

        req.authorId = decoded.authorId

        next()
    } catch (error) {
        console.error(`Error! ${error.message}`)
        res.status(500).send({ status: false, message: error.message })
    }
}


module.exports = {
     loginCheck
}