import { userService } from '../services/userService';
class UserController {
    async getAllUsers(req, res) {
        try {
            const users = await userService.getAllUsers();
            res.json(users);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(id);
            res.json(user);
        }
        catch (error) {
            if (error.message === 'User not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    async createUser(req, res) {
        try {
            const user = await userService.createUser(req.body);
            res.status(201).json(user);
        }
        catch (error) {
            if (error.message === 'Username or email already exists') {
                res.status(400).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.updateUser(id, req.body);
            res.json(user);
        }
        catch (error) {
            if (error.message === 'User not found') {
                res.status(404).json({ error: error.message });
            }
            else if (error.message === 'Username or email already exists') {
                res.status(400).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const result = await userService.deleteUser(id);
            res.json(result);
        }
        catch (error) {
            if (error.message === 'User not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    async toggleUserStatus(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.toggleUserStatus(id);
            res.json(user);
        }
        catch (error) {
            if (error.message === 'User not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    async getUserStats(req, res) {
        try {
            const stats = await userService.getUserStats();
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
export const userController = new UserController();
