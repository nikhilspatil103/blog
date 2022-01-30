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

const isValidString = function (value) {
    if (typeof value === "string" && value.trim().length === 0) return false;
    return true;
};


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
                const uniqueTagArr = [...new Set(tags)];   // new Set(tags) will set only unique values in an array
                blogData["tags"] = uniqueTagArr
            }

        }

        if (subcategory) {
            if (Array.isArray(subcategory)) {
                const uniqueSubcategoryArr = [...new Set(subcategory)];  // new Set(subcategory) will set only unique values in an array
                blogData['subcategory'] = uniqueSubcategoryArr
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
        const { authorId, category, tags, subcategory } = queryParams;
        if (!isValidString(authorId)) {
            return res.status(400).send({ status: false, message: "Author id is required" });
        }
        if (authorId) {
            if (!isValidObjectId(authorId)) {
                return res.status(400).send({ status: false, message: `authorId is not valid.` });
            }
        }
        if (!isValidString(category)) {
            return res.status(400).send({ status: false, message: "Category cannot be empty while fetching." });
        }
        if (!isValidString(tags)) {
            return res.status(400).send({ status: false, message: "tags cannot be empty while fetching." });
        }

        if (!isValidString(subcategory)) {
            return res.status(400).send({ status: false, message: "subcategory cannot be empty while fetching." });
        }
        if (isValidRequestBody(queryParams)) {
            const { authorId, category, tags, subcategory } = queryParams
            if (isValid(authorId) && isValidObjectId(authorId)) {
                filterQuery['authorId'] = authorId
            }
            if (isValid(category)) {
                filterQuery['category'] = category.trim()
            }
            if (isValid(tags)) {
                const tagsArr = tags.trim().split(',').map(x => x.trim())  // deleting the spaces within words
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


// async function updateDetails(req, res) {
    const updateDetails = async function (req, res) {
    try {
        let requestBody = req.body
        let authorIdFromToken = req.authorId
        let blogId = req.params.blogId
         
        const { title, body, tags, subcategory } = requestBody;
        if (!isValidObjectId(blogId)) {
            res.status(400).send({ status: false, message: `${blogId} is not a valid token id` })
            return
        }
        let Blog = await blogModel.findOne({ _id: blogId, isDeleted: false })
        if (!Blog) {
            return res.status(400).send({ status: false, msg: "No such blog found" });
        }

        if (Blog.authorId.toString() !== authorIdFromToken) {     //Authorization
            res.status(401).send({ status: false, message: `Unauthorized access! Owner info doesn't match` });
            return
        }

        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide cart details.' })
        }

        if (!isValidString(title)) {
            return res.status(400).send({ status: false, message: 'Title is required' })
        }

        if (!isValidString(body)) {
            return res.status(400).send({ status: false, message: 'Body is required' })
        }

        if (tags) {
            if (tags.length === 0) {
                return res.status(400).send({ status: false, message: "tags is required for updatation." });
            }
        }
        if (subcategory) {
            if (subcategory.length === 0) {
                return res.status(400).send({ status: false, message: "subcategory is required for updatation." });
            }
        }

        if (req.body.title || req.body.body || req.body.tags || req.body.subcategory) {

            const title = req.body.title
            const body = req.body.body
            const tags = req.body.tags
            const subcategory = req.body.subcategory
            const isPublished = req.body.isPublished


            const updatedBlog = await blogModel.findOneAndUpdate({ _id: req.params.blogId },
                {
                    title: title, body: body, $addToSet: { tags: tags, subcategory: subcategory },  //$addToSet will set unique values
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
            return res.status(400).send({ status: false, msg: "Please give blog details to update" })
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
        if (!isValidObjectId(id)) {
            res.status(400).send({ status: false, message: `${id} is not a valid token id` })
            return
        }
        let Blog = await blogModel.findOne({ _id: id })
        if (!Blog) {
            return res.status(400).send({ status: false, msg: "No such blog found" });
        }

        if (Blog.authorId.toString() !== authorIdFromToken) {    //Authorization
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
        const filterQuery = { isDeleted: false, deletedAt: null }
        const queryParams = req.query
        const authorIdFromToken = req.authorId

        if (!isValidObjectId(authorIdFromToken)) {
            res.status(400).send({ status: false, message: `${authorIdFromToken} is not a valid token id` })
            return
        }
        if (!isValidRequestBody(queryParams)) {
            res.status(400).send({ status: false, message: `No query params received. Aborting delete operation` })
            return
        }

        //extract body
        const { authorId, category, tags, subcategory, isPublished } = queryParams

        if (isValid(authorId) && isValidObjectId(authorId)) {
            filterQuery['authorId'] = authorId
        }
        if (isValid(category)) {
            filterQuery['category'] = category.trim()
        }
        if (isValid(isPublished)) {
            filterQuery['isPublished'] = isPublished
        }
        if (isValid(tags)) {
            const tagsArr = tags.trim().split(',').map(tag => tag.trim());   // deleting the spaces within words
            filterQuery['tags'] = { $all: tagsArr }
        }
        if (isValid(subcategory)) {
            const subcatArr = subcategory.trim().split(',').map(subcat => subcat.trim());
            filterQuery['subcategory'] = { $all: subcatArr }
        }

        //Validation Ends

        const findBlogs = await blogModel.find(filterQuery);

        if (Array.isArray(findBlogs) && findBlogs.length === 0) {
            res.status(404).send({ status: false, message: 'No matching blogs found' })
            return
        }

        let blogToBeDeleted = []

        findBlogs.map(blog => {
            if (blog.authorId.toString() === authorIdFromToken && blog.isDeleted === false) {  //Authorization
                blogToBeDeleted.push(blog._id)                                                 // this will push only authorized blogs in blogToBeDeleted
            }
        })
        if (blogToBeDeleted.length === 0) {
            res.status(404).send({ status: false, message: ' No blogs found for deletion.' })
            return
        }

        await blogModel.updateMany({ _id: { $in: blogToBeDeleted } }, { $set: { isDeleted: true, deletedAt: new Date() } })
        
        res.status(200).send({ status: true, message: 'Blog deleted successfully' });
    }
    catch (err) {
        res.status(500).send({ status: false, message: "Something went wrong", Error: err });
    }
}


module.exports = {
    createBlog, getBlog, deleteBlog, deleteSpecific, updateDetails
}
