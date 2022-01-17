const blogModel = require('../model/blogModel.js')
const authorModel = require('../model/authorModel.js')

const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

//!-----------------------------Functions----------------------------------//
const isValid = function (value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === "string" && value.trim().length === 0) return false
    return true
}

const isValidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0
}

const isValidObjectId = function (objectId) {
    return mongoose.Types.ObjectId.isValid(objectId)
}


//!-------------------------------------------------------------------------//
// creating blog by authorizing authorId.
const createBlog = async function (req, res) {
    try {
        const requestBody = req.body
        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide blog details' })
        }
        //Extract params
        const { title, body, authorId, tags, category, subcategory, isPublished } = requestBody
        // Validation starts
        if (!isValid(title)) {
            return res.status(400).send({ status: false, message: 'Blog Title is required' })
        }
        if (!isValid(body)) {
            return res.status(400).send({ status: false, message: 'Blog body is required' })
        }
        if (!isValid(authorId)) {
            return res.status(400).send({ status: false, message: 'Author id is required' })
        }
        if (!isValidObjectId(authorId)) {
            return res.status(400).send({ status: false, message: `${authorId} is not a valid author id` })
        }
        const author = await authorModel.findById(authorId)
        if (!author) {
            return res.status(400).send({ status: false, message: `Author does not exit` })
        }
        if (!isValid(category)) {
            return res.status(400).send({ status: false, message: 'Blog category is required' })
        }
        //validation Ends
        const blogData = {
            title,
            body,
            authorId,
            category,
            isPublished: isPublished ? isPublished : false,
            publishedAt: isPublished ? new Date() : null
        }

        if (tags) {
            if (Array.isArray(tags)) {
                blogData['tags'] = [...tags]
            }

        }

        if (subcategory) {
            if (Array.isArray(subcategory)) {
                blogData['subcategory'] = [...subcategory]
            }

        }

        const newBlog = await blogModel.create(blogData)
        res.status(201).send({ status: true, message: 'New blog created successfully', data: newBlog })
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }

}



//get all blogs by using filters - title,tags,category & subcategory.
const getBlog = async function (req, res) {
    try {
        let filterQuery = { isDeleted: false, deletedAt: null, isPublished: true }
        let queryParams = req.query
        if (isValidRequestBody(queryParams)) {
            const { authorId, category, tags, subcategory } = queryParams
            if (isValid(authorId) && isValidObjectId(authorId)) {
                filterQuery['authorId'] = authorId
            }
            if (isValid(category)) {
                filterQuery['category'] = category.trim()
            }
            if (isValid(tags)) {
                const tagsArr = tags.trim().split(',').map(x => x.trim())
                filterQuery['tags'] = { $all: tagsArr }
            }
            if (isValid(subcategory)) {
                const subcatArr = subcategory.trim().split(',').map(subcat => subcat.trim());
                filterQuery['subcategory'] = { $all: subcatArr }
            }

        }
        const blog = await blogModel.find(filterQuery)

        if (Array.isArray(blog) && blog.length === 0) {
            return res.status(404).send({ status: false, message: 'No blogs found' })
        }
        res.status(200).send({ status: true, message: 'Blogs list', data: blog })
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
}


async function updateDetails(req, res) {
    try {
        let authorIdFromToken = req.authorId
        let blogId = req.params.blogId
        let Blog = await blogModel.findOne({ _id: blogId })
        if (!Blog) {
            return res.status(400).send({ status: false, msg: "No such blog found" });
        }

        if (Blog.authorId.toString() !== authorIdFromToken) {
            res.status(401).send({ status: false, message: `Unauthorized access! Owner info doesn't match` });
            return
        }

        if (req.body.title || req.body.body || req.body.tags || req.body.subcategory) {

            const title = req.body.title
            const body = req.body.body
            const tags = req.body.tags
            const subcategory = req.body.subcategory
            const isPublished = req.body.isPublished


            const updatedBlog = await blogModel.findOneAndUpdate({ _id: req.params.blogId },
                {
                    title: title, body: body, $push: { tags: tags, subcategory: subcategory },
                    isPublished: isPublished
                }, { new: true })

            if (updatedBlog.isPublished == true) {
                updatedBlog.publishedAt = new Date()
            }
            if (updatedBlog.isPublished == false) {
                updatedBlog.publishedAt = null
            }
            res.status(200).send({ status: true, message: "Successfully updated blog details", data: updatedBlog })

        } else {
            return res.status(404).send({ status: false, msg: "Please give credentials to update" })
        }
    } catch (err) {
        res.status(500).send({ status: false, message: "Something went wrong", Error: err.message });
    }
}

//DELETE /blogs/:blogId - Mark is Deleted:true if the blogId exists and it is not deleted.
const deleteBlog = async function (req, res) {
    try {
        let authorIdFromToken = req.authorId
        let id = req.params.blogId
        let Blog = await blogModel.findOne({ _id: id })
        if (!Blog) {
            return res.status(400).send({ status: false, msg: "No such blog found" });
        }

        if (Blog.authorId.toString() !== authorIdFromToken) {
            res.status(401).send({ status: false, message: `Unauthorized access! Owner info doesn't match` });
            return
        }

        let data = await blogModel.findOne({ _id: id })

        if (data.isDeleted == false) {
            let Update = await blogModel.findOneAndUpdate({ _id: id }, { isDeleted: true, deletedAt: Date() }, { new: true })
            res.status(200).send({ status: true, message: "successfully deleted blog", data: Update })
        } else {
            return res.status(404).send({ status: false, msg: "Blog already deleted" });
        }

    } catch (err) {
        res.status(500).send({ status: false, message: "Something went wrong", Error: err });
    }
}

// DELETE /blogs?queryParams - delete blogs by using specific queries or filters.
const deleteSpecific = async function (req, res) {
    try {
        let authorIdFromToken = req.authorId
        if (req.query.category || req.query.authorId || req.query.tags || req.query.subcategory) {

            let obj = {};
            if (req.query.category) {
                obj.category = req.query.category
            }
            if (req.query.authorId) {
                obj.authorId = req.query.authorId;
            }
            if (req.query.tags) {
                obj.tags = req.query.tags
            }
            if (req.query.subcategory) {
                obj.subcategory = req.query.subcategory
            }
            if (req.query.published) {
                obj.isPublished = req.query.isPublished
            }
            let data = await blogModel.findOne(obj);

            if (!data) {
                return res.status(404).send({ status: false, msg: "The given data is Invalid" });
            }

            if (data.authorId.toString() !== authorIdFromToken) {
                res.status(401).send({ status: false, message: `Unauthorized access! Owner info doesn't match` });
                return
            }


            if (data.isDeleted == false) {
                data.isDeleted = true
                data.deletedAt = Date()
                data.save();
                res.status(200).send({ status: true, message: "Deleted successfully", data: data });
            } else {
                return res.status(400).send({ status: false, message: "Blog has been already deleted" })
            }



        } else {
            return res.status(404).send({ status: false, msg: "Mandatory body missing" });
        }
    }
    catch (err) {
        res.status(500).send({ status: false, message: "Something went wrong", Error: err });
    }
}


module.exports = {
    createBlog, getBlog, deleteBlog, deleteSpecific, updateDetails
}
