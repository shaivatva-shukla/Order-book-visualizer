#include <algorithm>
#include <cmath>
#include <cctype>
#include <cstdio>
#include <deque>
#include <iostream>
#include <queue>
#include <string>
#include <vector>

struct Order {
    double price;
    int quantity;
};

struct BuyCompare {
    bool operator()(const Order& a, const Order& b) const {
        return a.price < b.price;
    }
};

struct SellCompare {
    bool operator()(const Order& a, const Order& b) const {
        return a.price > b.price;
    }
};

class MatchingEngine {
public:
    void run() {
        std::string line;
        while (std::getline(std::cin, line)) {
            sanitizeLine(line);
            if (line.empty()) {
                continue;
            }

            if (circuitBreakerTriggered_) {
                continue;
            }

            const std::string type = sanitizeToken(extractStringValue(line, "type"));
            if (type != "order") {
                continue;
            }

            const std::string side = sanitizeToken(extractStringValue(line, "side"));
            const double price = extractNumberValue(line, "price");
            const int quantity = static_cast<int>(extractNumberValue(line, "quantity"));

            if (quantity <= 0 || price <= 0.0) {
                continue;
            }

            Order incoming{price, quantity};
            if (side == "buy") {
                buyBook_.push(incoming);
            } else if (side == "sell") {
                sellBook_.push(incoming);
            } else {
                continue;
            }

            matchOrders();
        }
    }

private:
    static void sanitizeLine(std::string& line) {
        line.erase(std::remove(line.begin(), line.end(), '\r'), line.end());
    }

    static std::string sanitizeToken(std::string value) {
        value.erase(std::remove(value.begin(), value.end(), '\r'), value.end());
        return value;
    }

    static std::string extractStringValue(const std::string& json, const std::string& key) {
        const std::string quotedKey = "\"" + key + "\"";
        const std::size_t keyPos = json.find(quotedKey);
        if (keyPos == std::string::npos) {
            return "";
        }

        const std::size_t colonPos = json.find(':', keyPos + quotedKey.size());
        if (colonPos == std::string::npos) {
            return "";
        }

        const std::size_t startQuote = json.find('"', colonPos + 1);
        if (startQuote == std::string::npos) {
            return "";
        }

        const std::size_t endQuote = json.find('"', startQuote + 1);
        if (endQuote == std::string::npos) {
            return "";
        }

        return json.substr(startQuote + 1, endQuote - startQuote - 1);
    }

    static double extractNumberValue(const std::string& json, const std::string& key) {
        const std::string quotedKey = "\"" + key + "\"";
        const std::size_t keyPos = json.find(quotedKey);
        if (keyPos == std::string::npos) {
            return 0.0;
        }

        const std::size_t colonPos = json.find(':', keyPos + quotedKey.size());
        if (colonPos == std::string::npos) {
            return 0.0;
        }

        std::size_t pos = colonPos + 1;
        while (pos < json.size() &&
               (std::isspace(static_cast<unsigned char>(json[pos])) || json[pos] == '\r')) {
            ++pos;
        }

        std::size_t end = pos;
        while (end < json.size() &&
               (std::isdigit(static_cast<unsigned char>(json[end])) || json[end] == '.' ||
                json[end] == '-' || json[end] == '+')) {
            ++end;
        }

        if (end == pos) {
            return 0.0;
        }

        try {
            return std::stod(json.substr(pos, end - pos));
        } catch (...) {
            return 0.0;
        }
    }

    void matchOrders() {
        while (!buyBook_.empty() && !sellBook_.empty() &&
               buyBook_.top().price >= sellBook_.top().price) {
            Order buy = buyBook_.top();
            Order sell = sellBook_.top();
            buyBook_.pop();
            sellBook_.pop();

            const int tradeQuantity = std::min(buy.quantity, sell.quantity);
            const double tradePrice = sell.price;

            emitTrade(tradePrice, tradeQuantity);

            buy.quantity -= tradeQuantity;
            sell.quantity -= tradeQuantity;

            if (buy.quantity > 0) {
                buyBook_.push(buy);
            }
            if (sell.quantity > 0) {
                sellBook_.push(sell);
            }

            if (circuitBreakerTriggered_) {
                break;
            }
        }
    }

    void emitTrade(double price, int quantity) {
        std::cout << "{\"type\":\"trade\", \"price\":" << price
                  << ", \"quantity\":" << quantity << "}" << std::endl;
        std::cout << std::flush;

        const double zScore = calculateZScore(price);

        recentTradePrices_.push_back(price);
        if (recentTradePrices_.size() > kWindowSize) {
            recentTradePrices_.pop_front();
        }

        if (zScore > 3.0) {
            std::cout << "{\"type\": \"CIRCUIT_BREAKER_TRIGGERED\"}" << std::endl;
            std::cout << std::flush;
            circuitBreakerTriggered_ = true;
        }
    }

    double calculateZScore(double newPrice) const {
        if (recentTradePrices_.empty() || recentTradePrices_.size() < 2) {
            return 0.0;
        }

        double sum = 0.0;
        for (const double price : recentTradePrices_) {
            sum += price;
        }

        const double count = static_cast<double>(recentTradePrices_.size());
        if (count <= 0.0) {
            return 0.0;
        }

        const double mean = sum / count;

        double squaredDiffSum = 0.0;
        for (const double price : recentTradePrices_) {
            const double diff = price - mean;
            squaredDiffSum += diff * diff;
        }

        const double variance = squaredDiffSum / count;
        if (variance <= 0.0) {
            return 0.0;
        }

        const double stdDev = std::sqrt(variance);
        if (stdDev < 1e-9 || !std::isfinite(stdDev)) {
            return 0.0;
        }

        const double zScore = (newPrice - mean) / stdDev;
        if (!std::isfinite(zScore)) {
            return 0.0;
        }

        return zScore;
    }

    static constexpr std::size_t kWindowSize = 20;

    std::priority_queue<Order, std::vector<Order>, BuyCompare> buyBook_;
    std::priority_queue<Order, std::vector<Order>, SellCompare> sellBook_;
    std::deque<double> recentTradePrices_;
    bool circuitBreakerTriggered_ = false;
};

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    std::cout.setf(std::ios::unitbuf);
    setvbuf(stdout, nullptr, _IONBF, 0);

    MatchingEngine engine;
    engine.run();
    return 0;
}
