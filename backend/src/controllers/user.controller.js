function me(req, res) {

    return res.json({

        success: true,

        user: req.user

    });

}

module.exports = {
    me
};