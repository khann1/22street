class userDAO:

    def __init__(self, conn):
        self.conn = conn

    def hasUser(self, googleID):
        cursor = self.conn.cursor()

        query = ('SELECT COUNT(1) '
                 'FROM users u '
                 'WHERE u.googleID_id = %s')

        try:
            cursor.execute(query, (googleID,))
            result = cursor.fetchone()
        except:
            raise
        finally:
            cursor.close()

        return result


    def getUserID(self, googleID):
        cursor = self.conn.cursor()

        query = ('SELECT u.id '
                 'FROM users u '
                 'WHERE u.google_id = %s ')

        try:
            cursor.execute(query, (googleID,))
            result = cursor.fetchone()
        except:
            raise
        finally:
            cursor.close()

        return result


    def createUser(self, googleProfile):
        cursor = self.conn.cursor()

        query = ('INSERT INTO users (google_id, email)'
                 'VALUES (%s, %s)')

        values = (googleProfile.id, googleProfile.email)

        try:
            cursor.execute(query, values)
            self.conn.commit()
        except:
            self.conn.rollback()
            raise
        finally:
            cursor.close()

        return cursor.lastrowid


    def deleteUser(self, userID):
        cursor = self.conn.cursor()

        query = ('DELETE FROM users u '
                 'WHERE u.id = %s '
                 'LIMIT 1')

        try:
            cursor.execute(query, (userID,))
            self.conn.commit()
        except:
            self.conn.rollback()
            raise
        finally:
            cursor.close()

        return True